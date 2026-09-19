import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

/* One continuous surface wrapped onto the merkaba cluster.
 *
 * The first attempt at this used the cluster's support function -- for each
 * direction, how far you travel before you have passed everything. That
 * describes a convex body and nothing else, so it came out as a blob with no
 * spikes and no valleys, and no amount of tessellation would have changed it:
 * measured against the true union it sat 47-73% too far out. Resolution was
 * never the limit there.
 *
 * This solves instead. Every vertex of an icosphere asks, along its own
 * direction, how far out the union of the twelve solids last reaches -- and
 * because each of those solids is an intersection of half-spaces, that question
 * has a closed form. The answer lands ON the surface rather than on a hull
 * around it, so the concavities between spikes survive.
 *
 * It used to search for the same answer: scan inward from the bounding radius
 * in sixty-four steps, take the first sample inside the union, then bisect
 * eight times. That spent seventy-two union tests per vertex where the solve
 * makes one pass over twelve shapes, and it was not even right -- a
 * tetrahedron's tips are thinner than one step, so roughly one ray in five
 * hundred stepped clean over the outermost surface and reported one up to 30%
 * of the cluster radius deeper. Those were the vertices that dented inward and
 * crawled as the cluster moved.
 *
 * Two things it cannot do, both inherent:
 *   - Serrated edges. An icosphere's triangles do not line up with the solid's
 *     edges, so every sharp edge samples as a sawtooth roughly one vertex
 *     spacing wide. More detail makes it finer, never gone.
 *   - Hollow arrangements. One radius per direction is all this
 *     parameterisation can carry, so a cluster whose surface is not star-shaped
 *     about the centre gets its hole bridged rather than wrapped. Sphere
 *     Lattice rings an empty middle, and would come back as a shell around the
 *     ring rather than as the ring.
 */

// How many shapes the shader is compiled for. The loop is bounded by this and
// breaks at the live count, so it costs nothing to leave headroom.
export const SKIN_MAX = 16;

// Taken off the model rather than assumed. basic-merkaba.glb is an exact
// stella octangula: all eight of its face planes sit at offset 3.3333 in model
// units, with a spread of 0.0000. Its tetrahedra are NOT in the canonical
// cube-corner frame, so using the canonical normals would have wrapped a solid
// rotated away from the one being drawn.
export const MODEL_PLANE_OFFSET = 10 / 3;
// A regular tetrahedron's circumradius is three times its inradius. The model's
// own tips are chamfered back to 9.868, so the analytic solid runs 1.3% longer
// at the points -- which only matters as a bound on how far out to look.
export const MODEL_TIP = 10;

export function createSkinData() {
  return {
    // xyz = the shape's centre in cluster space, w = its plane offset
    shape: Array.from({ length: SKIN_MAX }, () => new THREE.Vector4()),
    // world -> shape, so a sample can be tested in the shape's own frame
    invRot: Array.from({ length: SKIN_MAX }, () => new THREE.Matrix3()),
    // Held as uniform objects and handed straight to the shader, so whoever
    // owns the cluster writes them and there is no frame-ordering question
    // about which useFrame ran first.
    uCount: { value: 0 },
    uRMax: { value: 1 },
  };
}

const SKIN_GLSL = `
uniform vec4 uShape[${SKIN_MAX}];
uniform mat3 uInvRot[${SKIN_MAX}];
uniform float uRMax;
uniform float uOffset;
uniform int uCount;

// One tetrahedron's four face normals. The opposed tetrahedron's are their
// negatives, which is why a single sign flip solves both halves of a stella
// octangula out of the same four numbers.
const vec3 SKIN_N0 = vec3( 0.0,       -1.0,       0.0);
const vec3 SKIN_N1 = vec3( 0.8164966,  0.3333333, 0.4714045);
const vec3 SKIN_N2 = vec3(-0.8164966,  0.3333333, 0.4714045);
const vec3 SKIN_N3 = vec3( 0.0,        0.3333333,-0.9428090);

// Four half-spaces t*u <= r, intersected as one interval in t. Returns the
// interval's far end -- where the ray leaves this tetrahedron -- or -1.0 if the
// four have no common solution and the ray misses it altogether.
float skinFar(vec4 u, vec4 r, float rMax) {
  // A u of zero is a constraint that does not bound t in either direction.
  // Nudged off zero the division stays defined, and the infeasible case -- a
  // constraint already violated at t = 0 -- falls out as hi < lo on its own.
  vec4 su = u + (1.0 - abs(sign(u))) * 1e-9;
  vec4 q = r / su;
  bvec4 up = greaterThan(su, vec4(0.0));

  // A positive u puts a ceiling on t, a negative one a floor. The floor starts
  // at zero as well: the surface wanted is the one in front of the centre.
  float hi = min(min(up.x ? q.x : rMax, up.y ? q.y : rMax),
                 min(up.z ? q.z : rMax, up.w ? q.w : rMax));
  float lo = max(max(up.x ? 0.0 : q.x, up.y ? 0.0 : q.y),
                 max(up.z ? 0.0 : q.z, up.w ? 0.0 : q.w));

  return hi >= lo ? hi : -1.0;
}

// How far out along dir the union of the solids last reaches.
//
// Along a ray p(t) = t * dir, each of the four plane distances is affine in t
// -- m(t) = t*u - v -- so a half-space is one linear inequality, a tetrahedron
// is an interval, and that interval's far end IS the tetrahedron's surface
// along this ray. The union's outermost surface is then simply the largest far
// end over all twenty-four tetrahedra. Nothing is sampled, so nothing thin can
// be stepped over, and the answer is exact rather than quantised to a step.
float skinSurface(vec3 dir) {
  float best = -1.0;

  for (int i = 0; i < ${SKIN_MAX}; i++) {
    if (i >= uCount) break;

    // Both taken into the shape's own frame once, where the old search
    // rotated a fresh sample point on every one of its seventy-two steps.
    vec3 dl = uInvRot[i] * dir;
    vec3 cl = uInvRot[i] * uShape[i].xyz;
    float a = uShape[i].w;

    vec4 u = vec4(dot(SKIN_N0, dl), dot(SKIN_N1, dl), dot(SKIN_N2, dl), dot(SKIN_N3, dl));
    vec4 v = vec4(dot(SKIN_N0, cl), dot(SKIN_N1, cl), dot(SKIN_N2, cl), dot(SKIN_N3, cl));

    best = max(best, skinFar( u, v + a, uRMax));  // the tetrahedron where every m <= a
    best = max(best, skinFar(-u, a - v, uRMax));  // and the opposed one, every m >= -a
  }

  return best;
}
`;

const SKIN_BODY = `
vec3 skinDir = normalize(position);
float skinHit = skinSurface(skinDir);

vec3 transformed;
if (skinHit < 0.0) {
  // This ray misses the cluster entirely -- collapse it to the centre rather
  // than leave it out at the bounding radius where it would tent the surface.
  transformed = skinDir * 0.0001;
} else {
  // Pushed out along the ray, so the cage stands off the solids instead of
  // landing exactly on them and z-fighting. Radial rather than along the
  // normal, so the gap closes a little on faces that sit oblique to the ray --
  // which is cheap, and reads as the cage being a shell rather than an offset
  // copy.
  transformed = skinDir * (skinHit + uOffset);
}
`;

export default function ClusterSkin({
  data,
  detail = 32,
  color = 0x333333,
  metalness = 0.8,
  roughness = 0.2,
  wireframe = false,
  offset = 0,
  opacity = 1,
}) {
  const material = useMemo(() => {
    // Flat-shaded: the geometric normal of a triangle lying inside a face is
    // that face's true plane normal, so the facets come out right without
    // computing normals for a surface whose shape is only known per vertex.
    const m = new THREE.MeshStandardMaterial({
      color,
      metalness,
      roughness,
      // Flat shading only means anything on a filled surface; as a wireframe
      // there is no facet left to shade.
      flatShading: !wireframe,
      wireframe,
      transparent: opacity < 1,
      opacity,
      // A transparent cage should not write depth: its own wires would then
      // occlude each other in whatever order they happened to be drawn. The
      // depth *test* stays on, so the far side still hides behind the solids.
      depthWrite: opacity >= 1,
    });

    m.onBeforeCompile = (shader) => {
      shader.uniforms.uShape = { value: data.shape };
      shader.uniforms.uInvRot = { value: data.invRot };
      shader.uniforms.uCount = data.uCount;
      shader.uniforms.uRMax = data.uRMax;
      shader.uniforms.uOffset = { value: offset };
      shader.vertexShader = SKIN_GLSL + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        SKIN_BODY
      );
    };

    return m;
  }, [data, color, metalness, roughness, wireframe, offset, opacity]);

  const geometry = useMemo(
    // three subdivides a polyhedron as 20*(detail+1)^2 faces, so spacing falls
    // off as 1/detail rather than halving per step -- detail 48 is ~144k
    // vertices at 0.54 degrees apart, not the handful the name suggests.
    //
    // And it hands them over non-indexed. At detail 12 that is 10,140 vertices
    // standing for 1,731 distinct directions, every one of them running the
    // whole solve to arrive at an answer six of its neighbours already have.
    // Indexing lets the post-transform cache collapse that, and the wireframe
    // pass stops drawing each shared edge twice into the bargain -- 10,140 line
    // segments become 5,070, for exactly the same picture.
    //
    // Safe for the filled wrap as well as the cage: three's flat shading takes
    // its normals from screen-space derivatives in the fragment shader, so it
    // never wanted the split vertices in the first place.
    () => mergeVertices(new THREE.IcosahedronGeometry(1, detail)),
    [detail]
  );

  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh
      geometry={geometry}
      material={material}
      // Every vertex is displaced in the shader, so the geometry's own unit
      // bounding sphere says nothing about where this ends up on screen.
      frustumCulled={false}
      // Out of the shadow pass. Casting uses a separate depth material that
      // this displacement is not injected into, so it would throw the shadow
      // of an undisplaced unit sphere. Receiving is fine: the shadow lookup is
      // built from the vertex position we actually wrote.
      castShadow={false}
      receiveShadow
    />
  );
}
