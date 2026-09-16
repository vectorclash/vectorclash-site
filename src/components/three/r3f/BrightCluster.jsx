import { useRef, useEffect, useMemo } from 'react';
import { useGLTF, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { MotionPathPlugin } from 'gsap/all';
import tinycolor from 'tinycolor2';
import merkaba from '../../../assets/models/basic-merkaba.glb';
// The white-RGB variant, brought over from chromaforge. The sprite the star
// fields use is a black stencil -- its opaque pixels are RGB (0,0,0) and only
// its alpha carries the shape, because those fields composite it through
// `destination-atop` against a coloured gradient and discard its colour. Tinted
// directly on a sprite it renders inverted: a dark star on a bright disc. This
// variant has the identical alpha channel and white RGB, which is exactly what
// a tinted three.js sprite needs.
import StarLarge from '../../../images/star-sprite-large-3d.png';
import ClusterSkin, {
  createSkinData,
  MODEL_PLANE_OFFSET,
  MODEL_TIP,
} from './ClusterSkin';
import { detectPerformanceTier } from '../../utils/PerformanceDetector';
import {
  PATTERNS,
  buildSeeds,
  thomasReset,
  thomasStep,
  governor,
  newGovernor,
} from './merkabaPatterns';

gsap.registerPlugin(MotionPathPlugin);

// The cluster's own geometry is +-9.868 before anything scales it, which is
// what every size below is expressed against.
const GEO_R = 9.868;

const COUNT = 12;
// How far the pattern positions reach. The old scene used +-5, which was
// jitter next to shapes this size; the patterns need somewhere to happen.
// Together with the ratio below this puts the cluster at about 77% of the
// frame's height -- a backing, where the lab's settings came out at 108% and
// simply swallowed the page.
const ENVELOPE = 24;
// Shape half-extent as a multiple of the envelope. Above 1 the shapes
// interpenetrate and the cluster reads as one object rather than as twelve,
// which is the whole point of running it this dense.
const SIZE_RATIO = 1.4;

// A solid morphing into another solid reads as a shrug, so the envelope opens
// through the middle of a dissolve and closes again on the far side.
const LOOSEN = 0.25;

const HOLD = 12;
const BLEND = 4.5;

// How the cluster is drawn.
//   'solids'  the twelve merkabas, as they have always been
//   'wrap'    one continuous surface shrinkwrapped onto their union instead
//   'cage'    the solids, plus that surface as a dense wireframe standing off
//             them, so the wire reads as a shell around the crystal
// Every mode wraps the same solid: the plane normals come off
// basic-merkaba.glb, so switching does not move anything.
const CLUSTER_SKIN = 'cage';

// Vertices on the wrap, as three's polyhedron detail. Spacing falls off as
// 1/detail, and spacing is what decides how sharp a tip comes out and how fine
// the sawtooth along each edge is -- 48 is ~144k vertices at 0.54 degrees.
//
// The filled wrap and the cage want opposite things from it. Filled, more
// detail is strictly better. As a wireframe every one of those triangles draws
// its edges, so the same 48 is a solid wash of line; 12 is dense enough to read
// as a woven shell, which is the point of the cage.
const SKIN_SETTINGS = {
  wrap: {
    detail: { low: 16, medium: 32, high: 48 },
    wireframe: false,
    color: 0x333333,
    offset: 0,
    opacity: 1,
  },
  cage: {
    detail: { low: 10, medium: 12, high: 12 },
    wireframe: true,
    // Light, because the solids underneath are 0x333333 and a dark wire on a
    // dark crystal is just noise.
    color: 0xc8d4e0,
    // As a share of the envelope, so the gap holds if the cluster is resized.
    offset: 0.15,
    opacity: 0.45,
  },
};

// The lit spheres that orbit the cluster and aim their spotlights at the
// origin. They used to take waypoints from a +-75 box, which put 69% of them
// inside the cluster's own reach (~83 units once the shapes grew): most of the
// time they were lighting it from within, and from outside it read flat.
// Waypoints now sit on a shell clear of that reach.
const SPOT_RMIN = 95;
const SPOT_RMAX = 150;
// The camera frames +-75 units vertically at the cluster's depth but +-133
// horizontally, so an unconstrained shell spends most of its time above or
// below the frame. Flattening it towards the equator takes the shapes from
// on-screen 32% of the time to 46%, which is as far as this goes while still
// clearing the cluster.
const SPOT_Y_LIMIT = 0.5;
// Each waypoint is turned this far from the last, so a light keeps circulating
// instead of loitering on one side of the cluster.
const SPOT_STEP_MIN = (Math.PI / 180) * 25;
const SPOT_STEP_MAX = (Math.PI / 180) * 50;

// The halo billboard each bright shape carries, as a multiple of its own
// radius. Large enough that the shape's own front faces only ever occlude the
// middle ninth of it, so it reads as a glow around a core rather than a ring.
// The sprite's opaque core ends at 0.17 of its half-width: alpha holds around
// 250 out to 0.13 and drops to 183 at 0.17, which is the same figure
// chromaforge's STAR_SHAPE records for this asset. A sprite is scaled in world
// units across its full width, so drawing it at 2 / 0.17 times a sphere's
// radius lands the core exactly on that sphere's limb. No floor on this -- a
// minimum size would break the match for the smaller spheres.
const HALO_CORE_FRACTION = 0.17;
// The sphere reads bigger than its geometry, so the core is oversized to meet
// it. Perspective is not the reason it has to be this much: a sphere's
// silhouette does project larger than a billboard of the same half-width, but
// at these radii and distances that is 0.01-0.23%, and the icosphere's own
// faceting is another 1%. What actually widens it is bloom -- the sphere is
// emissive well past the composer's luminance threshold, so its glow spreads
// several pixels past the silhouette. Hence an empirical figure rather than a
// derived one; it tracks the bloom settings, not the camera.
const HALO_CORE_OVERSHOOT = 1.25;
const HALO_SCALE = (2 / HALO_CORE_FRACTION) * HALO_CORE_OVERSHOOT;

const ORIGIN = new THREE.Vector3(0, 0, 0);
const UP = new THREE.Vector3(0, 1, 0);
const UP_ALT = new THREE.Vector3(0, 0, 1);

// Ceiling on how fast a shape may turn, in radians a second. Facing rules can
// ask for an instantaneous flip -- a tangent reverses at every turning point in
// the motion, which is a genuine 180 degrees -- and honouring that literally
// reads as the cluster popping. Measured over twelve simulated minutes the
// median frame turns 0.4 degrees and the 99.9th percentile 11.7, so a cap here
// only ever touches the pathological tail.
const MAX_TURN_RATE = 6.0;

function smooth(x) {
  return x * x * (3 - 2 * x);
}

// Building a basis from a forward vector and a fixed world up collapses when
// the two line up: the cross product goes to zero and roll flips between
// frames. Shapes sitting near the cluster's poles hit that constantly. The up
// vector leans towards +Z as the two converge, smoothstepped so the handover
// itself introduces no jump.
function stableUp(forward, out) {
  const t = THREE.MathUtils.smoothstep(Math.abs(forward.dot(UP)), 0.85, 0.99);
  return out.copy(UP).lerp(UP_ALT, t).normalize();
}

// Swings a unit direction sideways by a random angle about a random axis
// perpendicular to it, then flattens it towards the equator. Mutates and
// returns the direction.
function advanceDirection(dir) {
  const perp = new THREE.Vector3(0, 1, 0);
  if (Math.abs(dir.y) > 0.9) perp.set(1, 0, 0);

  const axis = new THREE.Vector3().crossVectors(dir, perp).normalize();
  // Spun around dir first, or every light would only ever swing one way.
  axis.applyAxisAngle(dir, Math.random() * Math.PI * 2);

  dir
    .applyAxisAngle(
      axis,
      SPOT_STEP_MIN + Math.random() * (SPOT_STEP_MAX - SPOT_STEP_MIN)
    )
    .normalize();

  dir.y = Math.max(-SPOT_Y_LIMIT, Math.min(SPOT_Y_LIMIT, dir.y));

  return dir.normalize();
}

function randomDirection() {
  const v = new THREE.Vector3(
    Math.random() * 2 - 1,
    Math.random() * 2 - 1,
    Math.random() * 2 - 1
  );
  return v.lengthSq() < 1e-6 ? v.set(0, 1, 0) : v.normalize();
}

function MerkabaCluster({ geometry }) {
  const groupRef = useRef();
  const meshes = useRef([]);

  const seeds = useMemo(() => {
    thomasReset(COUNT);
    return buildSeeds(COUNT);
  }, []);

  const skinData = useMemo(
    () => (CLUSTER_SKIN === 'solids' ? null : createSkinData()),
    []
  );
  const skin = useMemo(() => {
    const cfg = SKIN_SETTINGS[CLUSTER_SKIN];
    if (!cfg) return null;
    const tier = detectPerformanceTier();
    return {
      ...cfg,
      detail: cfg.detail[tier] || cfg.detail.medium,
      offset: cfg.offset * ENVELOPE,
    };
  }, []);

  const shapeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.8,
        roughness: 0.2,
      }),
    []
  );

  useEffect(() => () => shapeMaterial.dispose(), [shapeMaterial]);

  // Scratch. Nothing in the frame loop allocates.
  const scratch = useMemo(
    () => ({
      pts: Array.from({ length: COUNT }, () => new THREE.Vector3()),
      pA: new THREE.Vector3(),
      pB: new THREE.Vector3(),
      tan: new THREE.Vector3(),
      tmp: new THREE.Vector3(),
      qA: new THREE.Quaternion(),
      qB: new THREE.Quaternion(),
      qWorld: new THREE.Quaternion(),
      qTarget: new THREE.Quaternion(),
      forward: new THREE.Vector3(),
      up: new THREE.Vector3(),
      camLocal: new THREE.Vector3(),
      eWorld: new THREE.Euler(),
      euler: new THREE.Euler(),
      matrix: new THREE.Matrix4(),
      skinM4: new THREE.Matrix4(),
      ctx: { yaw: 0 },
      gov: newGovernor(),
    }),
    []
  );

  // Which pattern is running, which is arriving, and how far through. Held in
  // a ref rather than in state: it changes every frame and nothing renders off
  // it. This is the whole conductor.
  const conductor = useRef({
    from: 0,
    to: 0,
    k: 1,
    blending: false,
    holdLeft: HOLD,
    clock: 0,
  });

  const orient = (i, t, seed, R, pattern, pos, ctx, q, camLocal) => {
    const { tan, tmp, euler, matrix, forward, up } = scratch;

    if (pattern.face === 'align') {
      euler.set(t * 0.17, t * 0.23, t * 0.11);
      return q.setFromEuler(euler);
    }
    if (pattern.face === 'spin') {
      return q.setFromAxisAngle(seed.axis, t * seed.spin * 3.2);
    }

    let target;
    if (pattern.face === 'tangent') {
      if (pattern.tangent) {
        pattern.tangent(i, COUNT, t, seed, R, tan);
        target = tmp.copy(pos).add(tan);
      } else {
        // Sampled a moment ahead: the heading is whichever way the pattern is
        // about to take this shape.
        pattern.pos(i, COUNT, t + 0.08, seed, R, tan, ctx);
        if (tan.distanceToSquared(pos) < 1e-8) tan.set(pos.x, pos.y, pos.z + 1);
        target = tan;
      }
    } else if (pattern.face === 'camera') {
      target = camLocal;
    } else {
      target = ORIGIN;
    }

    if (target.distanceToSquared(pos) < 1e-8) return q.identity();
    forward.subVectors(pos, target).normalize();
    matrix.lookAt(pos, target, stableUp(forward, up));
    return q.setFromRotationMatrix(matrix);
  };

  useFrame((state, rawDelta) => {
    const group = groupRef.current;
    if (!group) return;

    // The header pauses its frameloop when scrolled out of view, so the first
    // delta back can be enormous.
    const delta = Math.min(rawDelta, 1 / 20);
    const c = conductor.current;
    const { pts, pA, pB, qA, qB, qWorld, qTarget, eWorld, camLocal, ctx, gov } =
      scratch;

    c.clock += delta;
    thomasStep(delta);

    if (c.blending) {
      c.k += delta / BLEND;
      if (c.k >= 1) {
        c.k = 1;
        c.blending = false;
        c.from = c.to;
      }
    } else {
      c.holdLeft -= delta;
      if (c.holdLeft <= 0) {
        let next;
        do {
          next = Math.floor(Math.random() * PATTERNS.length);
        } while (next === c.from && PATTERNS.length > 1);
        c.to = next;
        c.k = 0;
        c.blending = true;
        // The punchy ones are punctuation, not a resting state.
        c.holdLeft = HOLD * (PATTERNS[next].punchy ? 0.55 : 1);
      }
    }

    const ke = smooth(c.k);
    const t = c.clock;
    const A = PATTERNS[c.from];
    const B = PATTERNS[c.to];
    const R = c.blending
      ? ENVELOPE * (1 + LOOSEN * Math.sin(Math.PI * ke))
      : ENVELOPE;

    // Planar patterns cancel the group's spin so their plane stays square to
    // the camera, and the governor needs it because local X is not screen X.
    // Taken from the world quaternion: this group turns on its own tween and
    // the scene group turns again underneath it on scroll.
    group.getWorldQuaternion(qWorld);
    ctx.yaw = eWorld.setFromQuaternion(qWorld, 'YXZ').y;

    // Grid Wave faces the camera, and the camera is not at the origin -- it
    // sits back on +Z and tracks the scroll. Brought into this group's space
    // once a frame rather than per shape.
    camLocal.copy(state.camera.position);
    group.worldToLocal(camLocal);

    for (let i = 0; i < COUNT; i++) {
      const seed = seeds[i];
      const mesh = meshes.current[i];
      if (!mesh) continue;

      A.pos(i, COUNT, t, seed, R, pA, ctx);
      const sa = A.scl(i, COUNT, t, seed);
      orient(i, t, seed, R, A, pA, ctx, qA, camLocal);

      if (c.blending) {
        B.pos(i, COUNT, t, seed, R, pB, ctx);
        const sb = B.scl(i, COUNT, t, seed);
        orient(i, t, seed, R, B, pB, ctx, qB, camLocal);
        pts[i].lerpVectors(pA, pB, ke);
        mesh.scale.setScalar(
          ((sa + (sb - sa) * ke) * ENVELOPE * SIZE_RATIO) / GEO_R
        );
        qTarget.copy(qA).slerp(qB, ke);
        mesh.quaternion.rotateTowards(qTarget, MAX_TURN_RATE * delta);
      } else {
        pts[i].copy(pA);
        mesh.scale.setScalar((sa * ENVELOPE * SIZE_RATIO) / GEO_R);
        mesh.quaternion.rotateTowards(qA, MAX_TURN_RATE * delta);
      }
    }

    // Governed on the blended result, so a dissolve is held to the same
    // silhouette budget as the patterns either side of it.
    const hold = c.blending ? A.hold + (B.hold - A.hold) * ke : A.hold;
    governor(gov, pts, COUNT, R, hold, ctx.yaw, delta);

    for (let i = 0; i < COUNT; i++) {
      if (meshes.current[i]) meshes.current[i].position.copy(pts[i]);
    }

    // The wrap reads the same centres, rotations and sizes the solids just
    // took, so it cannot drift out of step with them.
    if (skinData) {
      const { skinM4 } = scratch;
      let rMax = 0;

      for (let i = 0; i < COUNT; i++) {
        const mesh = meshes.current[i];
        if (!mesh) continue;

        const size = mesh.scale.x;
        skinData.shape[i].set(
          pts[i].x,
          pts[i].y,
          pts[i].z,
          size * MODEL_PLANE_OFFSET
        );
        skinM4.makeRotationFromQuaternion(mesh.quaternion);
        // A pure rotation's inverse is its transpose, so this is the world ->
        // shape transform without an actual inversion.
        skinData.invRot[i].setFromMatrix4(skinM4).transpose();

        rMax = Math.max(rMax, pts[i].length() + size * MODEL_TIP);
      }

      skinData.uCount.value = COUNT;
      skinData.uRMax.value = rMax + 1;
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: COUNT }).map((_, i) => (
        <mesh
          // eslint-disable-next-line react/no-array-index-key
          key={`merkaba-${i}`}
          ref={(el) => {
            meshes.current[i] = el;
          }}
          geometry={geometry}
          material={shapeMaterial}
          visible={CLUSTER_SKIN !== 'wrap'}
          castShadow
          receiveShadow
        />
      ))}

      {skinData && skin && (
        <ClusterSkin
          data={skinData}
          detail={skin.detail}
          wireframe={skin.wireframe}
          color={skin.color}
          offset={skin.offset}
          opacity={skin.opacity}
        />
      )}
    </group>
  );
}

function BrightShape({ color, initialDirection, haloTexture }) {
  const groupRef = useRef();
  const spotLightRef = useRef();
  // A little larger than before to hold their size at nearly twice the orbit
  // radius. Still whole numbers, so they stay a set rather than a gradient.
  const shapeSize = useMemo(() => 1 + Math.round(Math.random() * 3), []);
  const haloSize = useMemo(() => shapeSize * HALO_SCALE, [shapeSize]);
  const direction = useRef(initialDirection.clone());

  const initialPosition = useMemo(
    () =>
      initialDirection
        .clone()
        .multiplyScalar(SPOT_RMIN + Math.random() * (SPOT_RMAX - SPOT_RMIN))
        .toArray(),
    [initialDirection]
  );

  useEffect(() => {
    if (!groupRef.current) return undefined;

    let tween = null;

    const moveShape = () => {
      const speed = 5;
      const dir = direction.current;
      const path = [];

      // MotionPath curves *through* the waypoints, and the curve between two
      // widely separated points on a shell cuts inside it. A point is emitted
      // at each half-step as well, which keeps the whole path clear of the
      // cluster rather than only its corners.
      for (let leg = 0; leg < 3; leg++) {
        for (let half = 0; half < 2; half++) {
          advanceDirection(dir);
          const radius = SPOT_RMIN + Math.random() * (SPOT_RMAX - SPOT_RMIN);
          path.push({
            x: dir.x * radius,
            y: dir.y * radius,
            z: dir.z * radius,
          });
        }
      }

      tween = gsap.to(groupRef.current.position, {
        duration: speed + Math.random() * (speed * 5),
        motionPath: { path },
        ease: 'quad.inOut',
        onComplete: moveShape,
      });
    };

    moveShape();

    return () => {
      if (tween) tween.kill();
      gsap.killTweensOf(groupRef.current.position);
    };
  }, []);

  useFrame(() => {
    if (spotLightRef.current) {
      spotLightRef.current.target.position.set(0, 0, 0);
      spotLightRef.current.target.updateMatrixWorld();
    }
  });

  return (
    <group ref={groupRef} position={initialPosition}>
      <mesh>
        <icosahedronGeometry args={[shapeSize, 2]} />
        {/* Emissive above 1 is the point: the composer's buffers are
            half-float, so the extra range survives to the bloom pass and comes
            back as glow instead of clipping. At 1 these sat just under the
            0.7 luminance threshold and barely bloomed at all. */}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={3}
          fog={false}
          toneMapped={false}
        />
      </mesh>

      {/* The star field's own sprite, tinted to this light. Additive and
          unfogged to match how the fields draw it; depth-tested, so a shape
          that has orbited behind the cluster does not glow through it. */}
      {haloTexture && (
        <sprite scale={[haloSize, haloSize, 1]}>
          <spriteMaterial
            map={haloTexture}
            color={color}
            blending={THREE.AdditiveBlending}
            transparent
            opacity={0.85}
            depthWrite={false}
            fog={false}
            toneMapped={false}
          />
        </sprite>
      )}
      <spotLight
        ref={spotLightRef}
        color={color}
        intensity={3500}
        distance={500}
        angle={Math.PI / 4}
        penumbra={0.3}
        decay={1}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
      />
    </group>
  );
}

export default function BrightCluster() {
  const groupRef = useRef();
  const { nodes } = useGLTF(merkaba);
  const haloTexture = useTexture(StarLarge);

  useEffect(() => {
    haloTexture.colorSpace = THREE.SRGBColorSpace;
    haloTexture.needsUpdate = true;
  }, [haloTexture]);

  const geometry = useMemo(() => {
    return nodes?.Scene?.children?.[0]?.geometry || new THREE.SphereGeometry(1);
  }, [nodes]);

  const colors = useMemo(() => {
    return tinycolor('#CCFF00').spin(Math.random() * 360).tetrad();
  }, []);

  // Started on opposite sides rather than at four random points, so the
  // cluster is lit from several directions from the first frame.
  const brightShapeDirections = useMemo(
    () =>
      colors.map((_, i) => {
        const dir = randomDirection();
        return i % 2 ? dir.negate() : dir;
      }),
    [colors]
  );

  useEffect(() => {
    if (!groupRef.current) return undefined;

    const tween = gsap.to(groupRef.current.rotation, {
      duration: 20,
      y: Math.PI * 2,
      ease: 'none',
      repeat: -1,
    });

    return () => tween.kill();
  }, []);

  return (
    <group ref={groupRef}>
      <MerkabaCluster geometry={geometry} />

      {/* Bright shapes with lights */}
      {colors.map((color, i) => (
        <BrightShape
          key={`bright-${i}`}
          color={color.toHexString()}
          initialDirection={brightShapeDirections[i]}
          haloTexture={haloTexture}
        />
      ))}
    </group>
  );
}

// Preload the GLTF model
useGLTF.preload(merkaba);
