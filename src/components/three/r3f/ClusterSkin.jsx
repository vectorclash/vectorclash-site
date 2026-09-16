import { useMemo, useEffect } from 'react';
import * as THREE from 'three';

/* One continuous surface wrapped onto the merkaba cluster.
 *
 * The first attempt at this used the cluster's support function -- for each
 * direction, how far you travel before you have passed everything. That
 * describes a convex body and nothing else, so it came out as a blob with no
 * spikes and no valleys, and no amount of tessellation would have changed it:
 * measured against the true union it sat 47-73% too far out. Resolution was
 * never the limit there.
 *
 * This searches instead. Every vertex of an icosphere scans inward along its
 * own direction until it first lands inside the union of the twelve solids,
 * then bisects. It ends up ON the surface rather than on a hull around it, so
 * the concavities between spikes survive. Here resolution IS the limit, and
 * the detail level is what buys sharper tips.
 *
 * Two things it cannot do, both inherent:
 *   - Serrated edges. An icosphere's triangles do not line up with the solid's
 *     edges, so every sharp edge samples as a sawtooth roughly one vertex
 *     spacing wide. More detail makes it finer, never gone.
 *   - Hollow arrangements. A radial search needs the solid to be continuous
 *     from the centre outward. Sphere Lattice rings an empty middle -- 0% of
 *     its rays start inside -- so the wrap has no origin to search from.
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
// at the points -- which only matters as a bound on how far out to start the
// search.
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

// A stella octangula is two opposed tetrahedra, and a tetrahedron is the
// intersection of four half-spaces. The second tetrahedron's normals are the
// first's negatives, so the same four dot products decide both: inside one if
// their maximum clears the offset, inside the other if their minimum does.
// Four dots, exact sign, nothing approximated.
const SKIN_GLSL = `
uniform vec4 uShape[${SKIN_MAX}];
uniform mat3 uInvRot[${SKIN_MAX}];
uniform float uRMax;
uniform float uOffset;
uniform int uCount;

bool skinInside(vec3 p, float a) {
  vec4 m = vec4(
    -p.y,
     0.8164966 * p.x + 0.3333333 * p.y + 0.4714045 * p.z,
    -0.8164966 * p.x + 0.3333333 * p.y + 0.4714045 * p.z,
                       0.3333333 * p.y - 0.9428090 * p.z
  );
  float hi = max(max(m.x, m.y), max(m.z, m.w));
  float lo = min(min(m.x, m.y), min(m.z, m.w));
  return hi <= a || lo >= -a;
}

bool skinInUnion(vec3 p) {
  for (int i = 0; i < ${SKIN_MAX}; i++) {
    if (i >= uCount) break;
    vec3 rel = p - uShape[i].xyz;
    float tip = uShape[i].w * 3.0;
    // Bounding sphere first. Most shapes are nowhere near most samples, and
    // rejecting them costs three multiplies against the full test's rotate.
    if (dot(rel, rel) > tip * tip) continue;
    if (skinInside(uInvRot[i] * rel, uShape[i].w)) return true;
  }
  return false;
}
`;

const SKIN_BODY = `
vec3 skinDir = normalize(position);
float skinHit = -1.0;
float skinStep = uRMax / 64.0;

// Scan inward from the bounding radius: the first sample inside the union is
// the outermost surface along this ray, which is the one that shows.
for (int k = 0; k < 64; k++) {
  if (skinInUnion(skinDir * (uRMax - float(k) * skinStep))) {
    skinHit = uRMax - float(k) * skinStep;
    break;
  }
}

vec3 transformed;
if (skinHit < 0.0) {
  // This ray misses the cluster entirely -- collapse it to the centre rather
  // than leave it out at the bounding radius where it would tent the surface.
  transformed = skinDir * 0.0001;
} else {
  float lo = skinHit, hi = min(skinHit + skinStep, uRMax);
  for (int k = 0; k < 8; k++) {
    float mid = (lo + hi) * 0.5;
    if (skinInUnion(skinDir * mid)) lo = mid; else hi = mid;
  }
  // Pushed out along the ray, so the cage stands off the solids instead of
  // landing exactly on them and z-fighting. Radial rather than along the
  // normal, so the gap closes a little on faces that sit oblique to the ray --
  // which is cheap, and reads as the cage being a shell rather than an offset
  // copy.
  transformed = skinDir * (lo + uOffset);
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
    () => new THREE.IcosahedronGeometry(1, detail),
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
