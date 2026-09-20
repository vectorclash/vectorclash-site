import { useRef, useEffect, useMemo } from 'react';
import { useGLTF, useTexture } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { MotionPathPlugin } from 'gsap/all';
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
import { latchedSettings } from '../../utils/qualityLevel';
import useQuality from '../../utils/useQuality';
import { oklabToLinearInto } from '../../utils/oklab';
import {
  PATTERNS,
  pickPattern,
  patternTime,
  newMood,
  stepMood,
  drawHold,
  drawBlend,
  drawLoosen,
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

// Nothing about the conductor's timing is a constant any more. How long a
// pattern is held, how long the dissolve into it takes, how far the envelope
// opens through that dissolve, and which pattern is chosen at all are drawn
// per transition in merkabaPatterns.js -- see the conductor-aid section there.
// The state for the current transition lives on the conductor ref below.

// Everything in here is framed against the shorter axis of the canvas. On a
// desktop hero the camera's 60-degree vertical field is the tighter of the
// two, and every size below was chosen against it; on a phone held upright the
// frame is roughly half as wide as it is tall, the horizontal field becomes the
// tight one, and a composition sized for the vertical runs off both edges.
//
// Scaling by the aspect ratio below 1 fits the cluster to that tight axis
// exactly, holding the share of it the cluster already occupies on a desktop
// (aspect > 1 gives a scale of 1, so desktop framing is untouched). That turned
// out to be too literal a correction: on a phone it lands near 0.46 and the
// cluster stops reading as a backing for the type at all -- it becomes a small
// object floating in a lot of empty frame, which is a worse failure than the
// overflow it fixes. Some bleed past the edges is what makes it a backing.
//
// So only part of the correction is taken. At strength 1 the cluster fits the
// narrow axis exactly; at 0 it is left at desktop size and overflows; 0.5 is
// half way between, which measured against the two extremes is where it still
// fills a phone without running off it. This also bounds the scale at
// 1 - FIT_STRENGTH without needing a separate floor, and keeps the ordering
// across devices intact -- an iPad in portrait is wider than a phone and so is
// corrected less, where a flat floor would have given them both the same size.
//
// Whatever it works out to is applied to the whole group, not to the merkabas
// alone. Shrinking the
// cluster while the lit spheres kept a fixed orbit would not have been a
// smaller version of the same picture: the shell would have sat proportionally
// much further out, the lights would have spent even more of their time off a
// frame that is already narrow, and the cluster would have been lit from
// further away than it was ever lit on a desktop. A uniform scale keeps every
// ratio in the composition intact, and the two light constants that a scale
// does not reach are corrected explicitly where they are declared.
const FIT_STRENGTH = 0.5;

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
    detail: { low: 6, medium: 8, high: 8 },
    wireframe: true,
    // Light, because the solids underneath are 0x333333 and a dark wire on a
    // dark crystal is just noise.
    color: 0xc8d4e0,
    // As a share of the envelope, so the gap holds if the cluster is resized.
    offset: 0.15,
    opacity: 0.05,
  },
};

// The lit spheres that orbit the cluster and aim their spotlights at the
// origin. They used to take waypoints from a +-75 box, which put 69% of them
// inside the cluster's own reach (~83 units once the shapes grew): most of the
// time they were lighting it from within, and from outside it read flat.
// Waypoints now sit on a shell clear of that reach.
//
// Both radii are local to the cluster group, so the shell is carried by the
// FIT_STRENGTH scale along with everything else: the lights hold their distance
// *relative to the cluster* on every screen rather than their distance in
// world units.
const SPOT_RMIN = 95;
const SPOT_RMAX = 150;

// A spotlight's reach is not a distance in the scene graph, so a group scale
// does not touch it: three computes irradiance as intensity / d^decay, windowed
// by pow2(1 - (d/distance)^4), and d is the only term a scale moves. Left
// alone on a phone the lights would close to half their radius at full power
// and, at decay 1, put twice the light on the cluster -- past the bloom
// threshold, so it would not read as brighter so much as hazed over. Scaling
// both by the same factor holds the illumination exactly where it was: the
// intensity cancels the shorter d, and the cutoff keeps the falloff curve the
// same shape rather than flattening it.
const SPOT_INTENSITY = 3500;
const SPOT_DISTANCE = 500;
// The camera frames +-75 units vertically at the cluster's depth but +-133
// horizontally on a desktop hero, so an unconstrained shell spends most of
// its time above or below the frame. Flattening it towards the equator takes the shapes from
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

// How many lit shapes orbit the cluster. Four of them, each on its own long
// motion path, meant the cluster was lit from four sides at once and read
// evenly bright from every angle -- which is the one thing a crystal should not
// do. Two leave most of the surface in shadow at any moment, so the facets that
// are lit are the composition rather than the whole object being visible.
const BRIGHT_COUNT = 2;

// The lights no longer carry a palette of their own. They are keyed off
// whatever the background is showing at that instant: each one takes one of the
// field's eight stops, turns it to the far side of the hue wheel and lights the
// cluster with that. So the cluster is always the complement of what is behind
// it, and it keeps being the complement as the field flows through palette
// after palette -- there is nothing here to fall out of step, because the hue
// is solved from the live palette every frame rather than chosen once.
//
// Which two stops. Neither end of the window, where the palette is joining the
// one before or after it and the colour is partly the neighbour's; and a good
// distance apart, so the two lights are answering to genuinely different parts
// of the background rather than to two samples of the same wash.
const BRIGHT_SLOTS = [2, 5];

// A stop this close to the neutral axis has no hue to complement -- atan2 on
// noise -- so it borrows the other light's, and a palette that is grey all the
// way through falls back to a fixed pair. Against grey, any two hues contrast.
const NEUTRAL_CHROMA = 0.004;
const FALLBACK_HUES = [0, (Math.PI * 2) / 3];

// The two stops a palette hands over can sit close together on the wheel --
// GradientGenerator builds palettes out of near neighbours as readily as out of
// opposites -- and two complements of two near-identical stops are two copies
// of the same light. Below this they are pushed apart, symmetrically, so
// neither drifts far from the stop it came from.
const MIN_SEPARATION = (Math.PI / 180) * 60;

// What the complement is rendered at, rather than what the background stop
// happened to be. These are emissive bodies, so the floor is there because the
// complement of a deep navy at the navy's own lightness is a brown that never
// reads as a light at all; lightness still tracks the stop it came from, lifted
// off it.
//
// The ceiling is the more interesting one, and it is low. Brightness here comes
// from emissiveIntensity, which multiplies the colour by three before the
// composer ever sees it -- so an OKLab lightness near 1 buys no extra glow and
// costs the hue: the blue half of the wheel simply runs out of sRGB up there
// and the shape arrives white. Held in this band the light stays the colour it
// was asked for and the bloom pass makes it bright.
const LIGHT_LIFT = 0.25;
const LIGHT_L_MIN = 0.72;
const LIGHT_L_MAX = 0.82;
// OKLab chroma. Past roughly this the brighter hues leave sRGB and come back
// with a negative channel, which clamps to a different hue than the one asked
// for -- so the fit below walks it down rather than clamping the result.
const LIGHT_CHROMA = 0.15;
const GAMUT_STEP = 0.85;
const GAMUT_TRIES = 8;

// Scratch for the colour solve. Module level and shared between the shapes:
// each of them runs this to completion inside its own frame callback, and
// nothing here outlives the call.
const HUES = new Float64Array(BRIGHT_COUNT);
const LEVELS = new Float64Array(BRIGHT_COUNT);
const CHROMAS = new Float64Array(BRIGHT_COUNT);
const RGB = new Float64Array(3);

// Wrapped into -PI..PI, so two hues are always compared the short way round.
function hueDelta(a, b) {
  return ((((b - a + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
}

// Reads both stops out of the live palette and leaves the two complements in
// HUES. Solved as a pair rather than one at a time because the separation below
// is a property of the pair.
function solveHues(palette) {
  for (let i = 0; i < BRIGHT_COUNT; i++) {
    const o = BRIGHT_SLOTS[i] * 3;
    const a = palette[o + 1];
    const b = palette[o + 2];

    LEVELS[i] = palette[o];
    CHROMAS[i] = Math.hypot(a, b);
    HUES[i] = Math.atan2(b, a) + Math.PI;
  }

  if (CHROMAS[0] < NEUTRAL_CHROMA && CHROMAS[1] < NEUTRAL_CHROMA) {
    HUES[0] = FALLBACK_HUES[0];
    HUES[1] = FALLBACK_HUES[1];
    return;
  }
  if (CHROMAS[0] < NEUTRAL_CHROMA) HUES[0] = HUES[1];
  if (CHROMAS[1] < NEUTRAL_CHROMA) HUES[1] = HUES[0];

  const d = hueDelta(HUES[0], HUES[1]);
  if (Math.abs(d) < MIN_SEPARATION) {
    const push = (MIN_SEPARATION - Math.abs(d)) / 2;
    const dir = d < 0 ? -1 : 1;
    HUES[0] -= dir * push;
    HUES[1] += dir * push;
  }
}

// The colour light `i` should be this frame, written into a caller-owned
// THREE.Color. Channels above 1 are left alone -- the composer's buffers are
// half-float and that headroom is what the bloom pass reads -- and only
// negatives are fitted away, because a negative channel is a hue error rather
// than an overexposure.
function writeLightColor(out, palette, i) {
  solveHues(palette);

  const hue = HUES[i];
  const L = Math.min(Math.max(LEVELS[i] + LIGHT_LIFT, LIGHT_L_MIN), LIGHT_L_MAX);
  let chroma = LIGHT_CHROMA;

  for (let k = 0; k < GAMUT_TRIES; k++) {
    oklabToLinearInto(RGB, L, chroma * Math.cos(hue), chroma * Math.sin(hue));
    if (RGB[0] >= 0 && RGB[1] >= 0 && RGB[2] >= 0) break;
    chroma *= GAMUT_STEP;
  }

  return out.setRGB(
    Math.max(RGB[0], 0),
    Math.max(RGB[1], 0),
    Math.max(RGB[2], 0),
    THREE.LinearSRGBColorSpace
  );
}

// Shadows.
//
// Everything here exists because a spotlight's shadow camera, left alone, is
// a 90-degree frustum from 0.5 to 500 units aimed at a crystal that occupies a
// few dozen of them. Almost every texel in the map lands on empty space, and
// the depth range is so long that what does land on the crystal quantizes into
// acne. Both are fixed by fitting the frustum to the thing being shadowed,
// which is worth far more than any amount of map resolution.
//
// What three lets us fit, in 0.185:
//   near    ours outright.
//   focus   ours -- SpotLightShadow.updateMatrices reads it every frame and
//           sets the shadow camera's fov to the spotlight's angle times this.
//   far     not ours. The same method overwrites camera.far with the light's
//           `distance` on every frame it differs, and `distance` is the
//           falloff window the illumination is built on. So the near plane
//           does all the work here -- and it is enough: measured across the
//           orbit it takes the depth range from a flat 1000:1 to between 5:1
//           and 35:1, worst case at the near end of the orbit.

// A guess at the cluster's reach, used until the cluster has run a frame and
// published its real one. Generous on purpose: too small clips casters out of
// the shadow frustum and their shadows vanish, where too large only wastes
// texels for one frame.
const REACH_GUESS = 80;

// The near plane never gets closer to the light than this share of its
// distance, which only matters if the cluster ever swells far enough to
// swallow the lights.
const MIN_NEAR_FRACTION = 0.05;

// Peter-panning is the failure mode of a depth bias and acne is the failure
// mode of none, so the offset is taken along the surface normal instead --
// three's normalBias, which is the modern answer to both.
//
// It is expressed in world units, and this scene has no fixed world scale: the
// hero tweens its whole group up from 0.00002 over six seconds, and the fit
// scale shrinks it again on a narrow frame. So it is derived per frame rather
// than set as a constant, from the one length that actually matters -- the
// world size of a shadow texel, which is the frustum's width at the cluster
// over the map's resolution. Two texels is enough on geometry this faceted.
const NORMAL_BIAS_TEXELS = 2;

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

function MerkabaCluster({ geometry, fit, reachRef }) {
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
  // Quantized before it reaches the skin, because ClusterSkin rebuilds its
  // material -- and so recompiles its shader -- whenever opacity changes, and
  // fit moves with every canvas resize. A phone's address bar collapsing mid
  // scroll is a resize. Steps of 0.05 are finer than the eye reads on a wire
  // this faint and coarse enough that ordinary reflow does not cross one.
  const fitStep = Math.round(fit * 20) / 20;

  const skin = useMemo(() => {
    const cfg = SKIN_SETTINGS[CLUSTER_SKIN];
    if (!cfg) return null;
    // Latched, not adaptive. Detail is a polyhedron subdivision level, so a
    // change rebuilds the geometry and re-uploads it -- and because the cluster
    // is a wireframe, a rebuild also re-draws every edge in a different place.
    // That is the one thing on screen that cannot fade between two states.
    const { clusterDetail } = latchedSettings();
    return {
      ...cfg,
      detail: cfg.detail[clusterDetail] || cfg.detail.medium,
      offset: cfg.offset * ENVELOPE,
      // Opacity that low is a trace, and a trace only survives at desktop size.
      // The fit above shrinks the whole cluster on a narrow frame, and shrinking
      // a wireframe pulls its lines together and drops each one further under a
      // pixel, so the same 0.05 that reads as an edge on a desktop disappears on
      // a phone. Dividing by the fit gives it back exactly what the scale took:
      // 1 on a desktop, and twice the opacity at the phone end of the range,
      // with tablets in between rather than on one side of a breakpoint.
      opacity: cfg.opacity / fitStep,
    };
  }, [fitStep]);

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
    holdLeft: drawHold(0),
    clock: 0,
    // The weather. Drifts once per change; see stepMood.
    mood: newMood(),
    // Duration of the dissolve currently running, and how far the envelope
    // opens through it. Both are drawn when it starts, so they are constant
    // for its length and k stays linear in time.
    blend: 1,
    loosen: 0,
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

    // The hero pauses its frameloop when scrolled out of view, so the first
    // delta back can be enormous.
    const delta = Math.min(rawDelta, 1 / 20);
    const c = conductor.current;
    const { pts, pA, pB, qA, qB, qWorld, qTarget, eWorld, camLocal, ctx, gov } =
      scratch;

    c.clock += delta;
    thomasStep(delta);

    if (c.blending) {
      c.k += delta / c.blend;
      if (c.k >= 1) {
        c.k = 1;
        c.blending = false;
        c.from = c.to;
      }
    } else {
      c.holdLeft -= delta;
      if (c.holdLeft <= 0) {
        // The mood moves first, then picks against where it landed: the walk
        // is what gives the cluster runs of calm and runs of agitation rather
        // than an even sprinkle of both. Everything else about the transition
        // is drawn fresh, so no two are alike even between the same pair.
        c.mood = stepMood(c.mood);
        const next = pickPattern(c.from, c.mood);
        c.to = next;
        c.k = 0;
        c.blending = true;
        c.blend = drawBlend(next);
        c.loosen = drawLoosen(c.blend);
        c.holdLeft = drawHold(next);
      }
    }

    const ke = smooth(c.k);
    const A = PATTERNS[c.from];
    const B = PATTERNS[c.to];
    // Each pattern reads the cluster's clock through its own `rate`. Constant
    // per pattern, so a pattern's phase is still continuous in c.clock and a
    // dissolve still samples both sides at the same instant of real time.
    const tA = patternTime(A, c.clock);
    const tB = patternTime(B, c.clock);
    const R = c.blending
      ? ENVELOPE * (1 + c.loosen * Math.sin(Math.PI * ke))
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

      A.pos(i, COUNT, tA, seed, R, pA, ctx);
      const sa = A.scl(i, COUNT, tA, seed);
      orient(i, tA, seed, R, A, pA, ctx, qA, camLocal);

      if (c.blending) {
        B.pos(i, COUNT, tB, seed, R, pB, ctx);
        const sb = B.scl(i, COUNT, tB, seed);
        orient(i, tB, seed, R, B, pB, ctx, qB, camLocal);
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

    // How far the cluster actually reaches this frame, taken in the same pass
    // that seats the shapes. It used to be solved inside the skin branch, which
    // meant it did not exist in 'solids' mode and was a second walk over the
    // twelve when it did -- and the lights need it whichever mode is running,
    // because it is what their shadow frustums are fitted to.
    let rMax = 0;

    for (let i = 0; i < COUNT; i++) {
      const mesh = meshes.current[i];
      if (!mesh) continue;

      mesh.position.copy(pts[i]);
      rMax = Math.max(rMax, pts[i].length() + mesh.scale.x * MODEL_TIP);
    }

    reachRef.current = rMax;

    // The wrap reads the same centres, rotations and sizes the solids just
    // took, so it cannot drift out of step with them.
    if (skinData) {
      const { skinM4 } = scratch;

      for (let i = 0; i < COUNT; i++) {
        const mesh = meshes.current[i];
        if (!mesh) continue;

        skinData.shape[i].set(
          pts[i].x,
          pts[i].y,
          pts[i].z,
          mesh.scale.x * MODEL_PLANE_OFFSET
        );
        skinM4.makeRotationFromQuaternion(mesh.quaternion);
        // A pure rotation's inverse is its transpose, so this is the world ->
        // shape transform without an actual inversion.
        skinData.invRot[i].setFromMatrix4(skinM4).transpose();
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

// Fits a spotlight's shadow camera to the cluster, once a frame.
//
// The cluster sits at the world origin -- the same assumption the light's own
// target makes, one line up -- so the light's world distance to it is just the
// length of its world position. Its local distance is the length of its
// position inside the cluster group, and the ratio of the two is every scale
// between here and the world: the six-second intro tween, the narrow-frame fit,
// the lot. Nothing has to be told about any of them.
//
// The angles work out scale-free. The cluster subtends atan(reach / localDist)
// from the light whatever the group is scaled to, so `focus` is solved in local
// units and `near` is the only quantity that needs the world scale applied.
function fitShadow(light, group, reach, world, settings) {
  if (!group) return;

  const localDist = group.position.length();
  if (localDist < 1e-6) return;

  light.getWorldPosition(world);
  const dist = world.length();
  const scale = dist / localDist;

  // The fov the cluster actually needs, as a share of the one the spotlight
  // casts over. Across the orbit and the cluster's own breathing this measures
  // 0.4 to 0.9, and density goes as its square -- so between 1.3 and 6 times
  // the texels on the crystal, for a divide. That is more than doubling the map
  // buys, and unlike doubling the map it costs nothing.
  //
  // Never above 1: the shadow camera must not open wider than the light itself
  // or it would be shadowing ground the light never reaches.
  const shadowShare = Math.atan(reach / localDist) / light.angle;
  light.shadow.focus = Math.min(shadowShare, 1);

  // Pulled up to the near face of the cluster. `far` cannot be touched -- see
  // the note by REACH_GUESS -- so this is the whole of the depth-precision fix.
  light.shadow.camera.near = Math.max(
    (localDist - reach) * scale,
    dist * MIN_NEAR_FRACTION
  );
  // Ours to call. SpotLightShadow.updateMatrices refreshes the projection only
  // when the fov, aspect or far plane it owns has changed -- the near plane is
  // not one of them, so a frame where the focus happened to land unchanged
  // would otherwise render this new near against the old matrix.
  light.shadow.camera.updateProjectionMatrix();

  // A texel's width where it lands on the crystal. The frustum is fitted to the
  // cluster, so that is the cluster's own diameter over the map's resolution.
  light.shadow.normalBias =
    (NORMAL_BIAS_TEXELS * 2 * reach * scale) / settings.shadowMapSize;

  // Only read under PCF; basic filtering takes one unfiltered sample.
  light.shadow.radius = settings.shadowRadius;
}

function BrightShape({ index, paletteRef, reachRef, initialDirection, haloTexture, fit }) {
  const groupRef = useRef();
  const spotLightRef = useRef();
  const coreRef = useRef();
  const haloRef = useRef();
  // The colour is driven from the frame loop, so this is only what the shape is
  // built with -- solved from the palette the hero was seeded with rather than
  // left at a default, so the first frame is already the right colour.
  const color = useMemo(
    () => writeLightColor(new THREE.Color(), paletteRef.current, index),
    [paletteRef, index]
  );
  const { settings } = useQuality();
  // Scratch for the shadow fit. Nothing in the frame loop allocates.
  const lightWorld = useMemo(() => new THREE.Vector3(), []);
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

  // The map's resolution, driven by the governor. Not a program parameter --
  // it is only a render target -- so this can move mid-session without a
  // recompile. Three allocates the map lazily, so dropping the old one and
  // nulling the handle is all it takes to have it rebuilt at the new size.
  useEffect(() => {
    const light = spotLightRef.current;
    if (!light) return;

    const size = settings.shadowMapSize;
    if (light.shadow.mapSize.width === size) return;

    light.shadow.mapSize.set(size, size);
    if (light.shadow.map) {
      light.shadow.map.dispose();
      light.shadow.map = null;
    }
  }, [settings.shadowMapSize]);

  useFrame(() => {
    if (spotLightRef.current) {
      spotLightRef.current.target.position.set(0, 0, 0);
      spotLightRef.current.target.updateMatrixWorld();

      fitShadow(spotLightRef.current, groupRef.current, reachRef.current, lightWorld, settings);
    }

    // Straight from the live palette, every frame, with no easing over the top.
    // The background itself moves slowly -- a palette takes tens of seconds to
    // flow through the window -- so the complement of it moves just as slowly,
    // and a smoothing term here would only lag the thing it is tracking.
    writeLightColor(color, paletteRef.current, index);

    if (coreRef.current) {
      coreRef.current.color.copy(color);
      coreRef.current.emissive.copy(color);
    }
    if (haloRef.current) haloRef.current.color.copy(color);
    if (spotLightRef.current) spotLightRef.current.color.copy(color);
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
          ref={coreRef}
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
            ref={haloRef}
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
        intensity={SPOT_INTENSITY * fit}
        distance={SPOT_DISTANCE * fit}
        angle={Math.PI / 4}
        penumbra={0.3}
        decay={1}
        castShadow
      />
    </group>
  );
}

export default function BrightCluster({ paletteRef }) {
  const groupRef = useRef();
  const { nodes } = useGLTF(merkaba);
  const haloTexture = useTexture(StarLarge);

  // Select narrowly: the canvas pixel size is all this needs, and subscribing
  // to the whole store would re-render on every camera tween. Pixels rather
  // than r3f's `viewport`, because viewport is measured at the camera's
  // distance from the origin and the hero tweens the camera on scroll -- the
  // ratio of the two is the same either way, but taking it from size means the
  // fit cannot breathe as the page moves.
  const size = useThree((state) => state.size);
  const fit = 1 - FIT_STRENGTH * (1 - Math.min(1, size.width / size.height));

  // How far the cluster reaches, in the group's own units, republished every
  // frame by the cluster and read by the lights to fit their shadow frustums.
  // A ref for the usual reason: it changes every frame and nothing renders off
  // it. The cluster's solve runs first -- it is declared first, and r3f calls
  // frame subscribers in mount order at equal priority -- so the lights fit
  // against this frame's cluster rather than the last one's.
  const reachRef = useRef(REACH_GUESS);

  useEffect(() => {
    haloTexture.colorSpace = THREE.SRGBColorSpace;
    haloTexture.needsUpdate = true;
  }, [haloTexture]);

  const geometry = useMemo(() => {
    return nodes?.Scene?.children?.[0]?.geometry || new THREE.SphereGeometry(1);
  }, [nodes]);

  // Started on opposite sides rather than at two random points, so the cluster
  // is lit from both of them from the first frame. With only two lights this
  // matters more than it did with four: two that happened to start near each
  // other would leave the whole far side dark until the paths carried them
  // apart, which is minutes, not seconds.
  const brightShapeDirections = useMemo(
    () =>
      Array.from({ length: BRIGHT_COUNT }, (_, i) => {
        const dir = randomDirection();
        return i % 2 ? dir.negate() : dir;
      }),
    []
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
    // The tween above drives rotation.y only, so the scale here is never
    // fought over.
    <group ref={groupRef} scale={fit}>
      <MerkabaCluster geometry={geometry} fit={fit} reachRef={reachRef} />

      {/* Bright shapes with lights */}
      {brightShapeDirections.map((dir, i) => (
        <BrightShape
          // eslint-disable-next-line react/no-array-index-key
          key={`bright-${i}`}
          index={i}
          paletteRef={paletteRef}
          reachRef={reachRef}
          initialDirection={dir}
          haloTexture={haloTexture}
          fit={fit}
        />
      ))}
    </group>
  );
}

// Preload the GLTF model
useGLTF.preload(merkaba);
