import * as THREE from 'three';

/* Merkaba cluster choreography.
 *
 * Every pattern is a pure function of time writing a position, a scale and an
 * orientation rule, so any two of them can be evaluated at the same instant
 * and cross-dissolved. Ported from the motion lab unchanged: no React and no
 * GSAP in here, only three's vector maths.
 *
 * The cluster backs the header type, so a pattern may not trade away the
 * silhouette for its effect: each one is written to hold its projected
 * footprint inside a band, and declares a `hold` weight saying how hard the
 * footprint governor is allowed to correct it on top of that.
 *
 *   pos(i, n, t, s, R, out, ctx)  -> writes a local-space position
 *   scl(i, n, t, s)               -> scale multiplier
 *   face                          -> 'center' | 'align' | 'tangent' | 'camera' | 'spin'
 *   hold                          -> 0 (leave alone) .. 1 (footprint fully locked)
 *
 * ctx.yaw is the cluster group's current Y rotation. Planar patterns cancel it
 * so their plane stays square to the camera instead of turning edge-on.
 */
var TAU = Math.PI * 2;
var PHI = (1 + Math.sqrt(5)) / 2;

var AX_X = new THREE.Vector3(1, 0, 0);
var AX_Y = new THREE.Vector3(0, 1, 0);
var AX_Z = new THREE.Vector3(0, 0, 1);

// Evenly distributed directions on the sphere; the base layout that the
// radial patterns push and pull along.
function fibDirs(n) {
  var out = [];
  for (var i = 0; i < n; i++) {
    var y = 1 - (i / Math.max(n - 1, 1)) * 2;
    var r = Math.sqrt(Math.max(0, 1 - y * y));
    var th = i * Math.PI * (3 - Math.sqrt(5));
    out.push(new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r));
  }
  return out;
}

var ICO = (function () {
  var v = [];
  [[0, 1, PHI], [0, -1, PHI], [0, 1, -PHI], [0, -1, -PHI]].forEach(function (a) {
    v.push(new THREE.Vector3(a[0], a[1], a[2]).normalize());
    v.push(new THREE.Vector3(a[1], a[2], a[0]).normalize());
    v.push(new THREE.Vector3(a[2], a[0], a[1]).normalize());
  });
  return v;
})();

// ------------------------------------------------------------------ seeds
// Per-shape constants, rerolled only when the shape count changes so a
// pattern never re-scatters mid-run.
function buildSeeds(n) {
  var dirs = fibDirs(n);
  var seeds = [];
  for (var i = 0; i < n; i++) {
    var axis = new THREE.Vector3(
      Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1
    ).normalize();
    var u = Math.abs(axis.y) > 0.9 ? AX_X : AX_Y;
    var e1 = new THREE.Vector3().crossVectors(axis, u).normalize();
    var e2 = new THREE.Vector3().crossVectors(axis, e1).normalize();
    seeds.push({
      dir: dirs[i],
      axis: axis, e1: e1, e2: e2,
      a: Math.random() * TAU, b: Math.random() * TAU, c: Math.random() * TAU,
      r: 0.55 + Math.random() * 0.75,
      lat: Math.random() * 2 - 1,
      w1: 0.7 + Math.random() * 0.8,
      w2: 0.6 + Math.random() * 0.9,
      w3: 0.8 + Math.random() * 0.7,
      spin: 0.25 + Math.random() * 0.7,
      size: 0.85 + Math.random() * 0.4
    });
  }
  return seeds;
}

// ------------------------------------------------- Thomas attractor state
// Integrated every frame whether or not its pattern is on screen, so cutting
// to it never starts from a cold, bunched-up state.
var thomasPts = [];
function thomasReset(n) {
  thomasPts = [];
  for (var i = 0; i < n; i++) {
    // Seeded across the attractor's own extent. Seeding them all within a
    // quarter-unit of each other -- the obvious way -- leaves every
    // trajectory stacked on the next until chaos finally separates them,
    // which measured as a cluster with no silhouette at all.
    thomasPts.push(new THREE.Vector3(
      (Math.random() * 2 - 1) * 4.2,
      (Math.random() * 2 - 1) * 4.2,
      (Math.random() * 2 - 1) * 4.2
    ));
  }
}
function thomasStep(dt) {
  var b = 0.1998, h = Math.min(dt, 0.05) * 2.2;
  for (var i = 0; i < thomasPts.length; i++) {
    var p = thomasPts[i];
    var dx = Math.sin(p.y) - b * p.x;
    var dy = Math.sin(p.z) - b * p.y;
    var dz = Math.sin(p.x) - b * p.z;
    p.set(p.x + dx * h, p.y + dy * h, p.z + dz * h);
  }
}

// Squarish column count, so the planar patterns are never a 5-wide ribbon
// two rows tall the way a fixed 5 made them at n = 10.
function gridCols(n) { return Math.max(2, Math.round(Math.sqrt(n * 1.3))); }


// ------------------------------------------------------------- governor
// The cluster backs the header type, so its silhouette is a budget, not an
// outcome. Correcting overall size alone is not enough: the patterns that
// failed hardest were not small, they were *thin* -- a ring turned edge-on,
// a trail drawn as a wire, a plane rotated away. Both need the same fix
// applied on different axes, so the correction is anisotropic.
//
// Each frame the shapes are projected onto the screen plane, their 2x2
// covariance is decomposed, and the two principal spreads are pulled towards
// a major and a minor target. Only the in-plane components move; depth is
// left alone, so nothing about the pattern's perspective changes. `hold`
// scales how much of the correction a given pattern accepts, and the gains
// are smoothed over ~0.6s so a fast pattern cannot make the cluster pump.
var TARGET_MAJ = 0.64;
var TARGET_MIN = 0.46;
var GAIN_MIN = 0.72, GAIN_MAX = 2.1, GAIN_TAU = 0.6;

function newGovernor() {
  return { g1: 1, g2: 1, Saa: null, Sab: 0, Sbb: 0 };
}

function governor(g, pts, n, R, hold, yaw, dt) {
  var ch = Math.cos(yaw), sh = Math.sin(yaw);
  var i, p, a, b;

  // Screen axes expressed in the cluster's own space: the group's Y rotation
  // means local X is not screen X. h is where local space lands horizontally.
  var ca = 0, cb = 0;
  for (i = 0; i < n; i++) {
    p = pts[i];
    ca += p.x * ch + p.z * sh;
    cb += p.y;
  }
  ca /= n; cb /= n;

  var Saa = 0, Sab = 0, Sbb = 0;
  for (i = 0; i < n; i++) {
    p = pts[i];
    a = p.x * ch + p.z * sh - ca;
    b = p.y - cb;
    Saa += a * a; Sab += a * b; Sbb += b * b;
  }
  Saa /= n; Sab /= n; Sbb /= n;

  // Smoothed before it is decomposed, not after. The eigenvectors of a
  // near-isotropic cloud are ill-conditioned -- when the two spreads are
  // close, the principal axis can swing far on a frame's worth of movement,
  // and since the two gains differ the cluster takes a visible twitch. Damping
  // the tensor keeps the axis it yields continuous. Measured over twelve
  // simulated minutes this was the single worst position jump in the run.
  if (g.Saa === null) { g.Saa = Saa; g.Sab = Sab; g.Sbb = Sbb; }
  var kt = 1 - Math.exp(-Math.min(dt, 0.25) / GAIN_TAU);
  g.Saa += (Saa - g.Saa) * kt;
  g.Sab += (Sab - g.Sab) * kt;
  g.Sbb += (Sbb - g.Sbb) * kt;
  Saa = g.Saa; Sab = g.Sab; Sbb = g.Sbb;

  var tr = Saa + Sbb;
  var disc = Math.sqrt(Math.max(tr * tr * 0.25 - (Saa * Sbb - Sab * Sab), 0));
  var l1 = tr * 0.5 + disc, l2 = tr * 0.5 - disc;
  var s1 = Math.sqrt(Math.max(l1, 1e-6)), s2 = Math.sqrt(Math.max(l2, 1e-6));

  // Major axis of the projected cloud.
  var ux, uy;
  if (Math.abs(Sab) > 1e-9) {
    ux = l1 - Sbb; uy = Sab;
    var m = Math.hypot(ux, uy); ux /= m; uy /= m;
  } else if (Saa >= Sbb) { ux = 1; uy = 0; } else { ux = 0; uy = 1; }

  var t1 = Math.min(Math.max(1 + (TARGET_MAJ * R / s1 - 1) * hold, GAIN_MIN), GAIN_MAX);
  var t2 = Math.min(Math.max(1 + (TARGET_MIN * R / s2 - 1) * hold, GAIN_MIN), GAIN_MAX);
  var k = 1 - Math.exp(-Math.min(dt, 0.25) / GAIN_TAU);
  g.g1 += (t1 - g.g1) * k;
  g.g2 += (t2 - g.g2) * k;

  for (i = 0; i < n; i++) {
    p = pts[i];
    a = p.x * ch + p.z * sh - ca;
    b = p.y - cb;
    // Into the principal frame, scale, and back out.
    var c1 = a * ux + b * uy, c2 = -a * uy + b * ux;
    c1 *= g.g1; c2 *= g.g2;
    var na = c1 * ux - c2 * uy, nb = c1 * uy + c2 * ux;
    var da = na - a, db = nb - b;
    p.x += da * ch;
    p.z += da * sh;
    p.y += db;
  }

  return { major: s1 * g.g1 / R, minor: s2 * g.g2 / R };
}

// ---------------------------------------------------------------- patterns
var PATTERNS = [
  {
    id: 'drift', name: 'Drift Field', kind: 'chaotic', face: 'center', hold: 0.5,
    desc: 'Today’s behaviour, rewritten as layered sines: every shape wanders its own slow box on its own clock. The resting state the other fourteen leave from and return to.',
    pos: function (i, n, t, s, R, o) {
      o.set(
        (Math.sin(t * 0.21 * s.w1 + s.a) * 0.52 + Math.sin(t * 0.13 * s.w2 + s.b) * 0.3) * R,
        (Math.sin(t * 0.17 * s.w2 + s.b) * 0.52 + Math.sin(t * 0.11 * s.w3 + s.c) * 0.28) * R,
        (Math.sin(t * 0.19 * s.w3 + s.c) * 0.52 + Math.sin(t * 0.15 * s.w1 + s.a) * 0.26) * R
      );
      // The unfloored version -- what the hero runs today -- lets every shape
      // wander through the middle at once, and measured the second-thinnest
      // silhouette of the fifteen. Shapes are held off the centre along their
      // own bearing instead, which leaves the wander intact.
      var d = o.length();
      if (d < R * 0.5) o.addScaledVector(s.dir, (R * 0.5 - d));
    },
    scl: function (i, n, t, s) { return s.size * (0.9 + 0.22 * Math.sin(t * 0.33 + s.a)); }
  },
  {
    id: 'breath', name: 'Breath', kind: 'organic', face: 'center', hold: 0.35,
    desc: 'Every shape rides its own radial out from the centre and back in unison. Floored at 62% of the envelope and paid back in scale, so the cluster reads as inhaling without deflating behind the type.',
    pos: function (i, n, t, s, R, o) {
      var e = 0.5 + 0.5 * Math.sin(t * 0.45);
      o.copy(s.dir).multiplyScalar(R * (0.62 + 0.32 * e));
    },
    // Mass is conserved the way it reads, not the way it measures: as the
    // cluster draws in, the shapes grow to keep the covered area steady.
    scl: function (i, n, t, s) {
      var e = 0.5 + 0.5 * Math.sin(t * 0.45);
      return s.size * (1.22 - 0.3 * e);
    }
  },
  {
    id: 'pulse', name: 'Pulse Wave', kind: 'organic', face: 'center', hold: 0.3,
    desc: 'The same radial motion with each shape a beat behind the last, so expansion travels through the cluster as a wave. The stagger is what keeps the envelope full — something is always at the outside.',
    pos: function (i, n, t, s, R, o) {
      var e = 0.5 + 0.5 * Math.sin(t * 0.8 - (i / n) * TAU);
      o.copy(s.dir).multiplyScalar(R * (0.48 + 0.48 * e));
    },
    scl: function (i, n, t, s) {
      return s.size * (0.78 + 0.42 * (0.5 + 0.5 * Math.sin(t * 0.8 - (i / n) * TAU)));
    }
  },
  {
    id: 'halo', name: 'Halo Ring', kind: 'geometric', face: 'align', hold: 0.3,
    desc: 'All shapes on one circle, evenly spaced, in a plane built square to the camera and precessing only far enough to show its thickness — never far enough to present an edge.',
    planar: true,
    pos: function (i, n, t, s, R, o, ctx) {
      var a = (i / n) * TAU + t * 0.3;
      // Built in XY, not XZ: a ring in the ground plane is edge-on to the
      // camera at rest, which is a horizontal line, not a backing.
      o.set(Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92, 0);
      o.applyAxisAngle(AX_X, Math.sin(t * 0.21) * 0.42);
      o.applyAxisAngle(AX_Y, Math.cos(t * 0.17) * 0.38 - ctx.yaw);
    },
    scl: function (i, n, t, s) { return 1.05; }
  },
  {
    id: 'helix', name: 'Double Helix', kind: 'geometric', face: 'tangent', hold: 0.4,
    desc: 'Two strands counter-phased by half a turn, on a wide radius and a short rise so the braid fills the frame rather than drawing a tall thin column. The axis leans as it turns.',
    pos: function (i, n, t, s, R, o) {
      var strand = i % 2;
      var rows = Math.ceil(n / 2);
      var k = Math.floor(i / 2) / Math.max(rows - 1, 1);
      var a = t * 0.65 + k * 3.1 + strand * Math.PI;
      o.set(Math.cos(a) * R * 0.74, (k - 0.5) * 1.55 * R, Math.sin(a) * R * 0.74);
      o.applyAxisAngle(AX_Z, Math.sin(t * 0.19) * 0.5);
    },
    scl: function () { return 1.0; }
  },
  {
    id: 'lattice', name: 'Sphere Lattice', kind: 'geometric', face: 'center', hold: 0.15,
    desc: 'A golden-spiral shell at fixed radius, tumbling on two axes. The most ordered state in the set, and the steadiest footprint — equal spacing, equal scale, every face turned inward.',
    pos: function (i, n, t, s, R, o) {
      o.copy(s.dir).multiplyScalar(R * 0.9);
      o.applyAxisAngle(AX_Y, t * 0.24);
      o.applyAxisAngle(AX_X, Math.sin(t * 0.16) * 0.7);
    },
    scl: function () { return 1.05; }
  },
  {
    id: 'crystal', name: 'Crystal Lock', kind: 'geometric', face: 'align', hold: 0.15,
    desc: 'Shapes snap to the twelve vertices of an icosahedron and hold, breathing a few percent. Shared rotation turns the whole cluster into one faceted solid revolving in place.',
    pos: function (i, n, t, s, R, o) {
      o.copy(ICO[i % 12]).multiplyScalar(R * 0.88 * (1 + 0.05 * Math.sin(t * 0.7 + i)));
      o.applyAxisAngle(AX_Y, t * 0.18);
      o.applyAxisAngle(AX_Z, t * 0.11);
    },
    scl: function () { return 1.1; }
  },
  {
    id: 'lissa', name: 'Lissajous', kind: 'geometric', face: 'tangent', hold: 0.55,
    desc: 'Each shape traverses its own Lissajous figure on small integer ratios, so paths repeatedly fall into phase, align for a beat, and separate again.',
    pos: function (i, n, t, s, R, o) {
      var A = 1 + (i % 3), B = 2 + ((i + 1) % 3), C = 1 + ((i + 2) % 4);
      o.set(
        Math.sin(t * 0.32 * A + s.a) * R * 0.8,
        Math.sin(t * 0.32 * B + s.b) * R * 0.72,
        Math.sin(t * 0.32 * C * 0.6 + s.c) * R * 0.8
      );
    },
    scl: function (i, n, t, s) { return s.size; }
  },
  {
    id: 'orbit', name: 'Orbit Swarm', kind: 'chaotic', face: 'tangent', hold: 0.6,
    desc: 'Every shape on a private circular orbit with its own radius, rate and inclination. Ordered up close, incoherent as a whole — an orrery with no shared plane.',
    pos: function (i, n, t, s, R, o) {
      var th = t * (0.28 + s.r * 0.4) + s.a;
      var rad = R * (0.62 + s.r * 0.3);
      o.copy(s.e1).multiplyScalar(Math.cos(th) * rad).addScaledVector(s.e2, Math.sin(th) * rad);
    },
    scl: function (i, n, t, s) { return s.size; }
  },
  {
    id: 'vortex', name: 'Vortex', kind: 'organic', face: 'tangent', hold: 0.35,
    desc: 'Angular rate climbs as shapes fall towards the waist, so they wind tight through the middle and unwind at the poles. Tornado motion with no wrap-around seam.',
    pos: function (i, n, t, s, R, o) {
      var y = R * 0.9 * Math.sin(t * 0.26 + (i / n) * TAU);
      var rad = R * 0.86 * (1 - 0.42 * Math.abs(y) / R);
      var a = t * 1.35 + (i / n) * TAU * 1.5 + y * 0.22;
      o.set(Math.cos(a) * rad, y, Math.sin(a) * rad);
    },
    scl: function (i, n, t, s) {
      return s.size * (0.85 + 0.3 * (1 - Math.abs(Math.sin(t * 0.26 + (i / n) * TAU))));
    }
  },
  {
    id: 'thomas', name: 'Strange Attractor', kind: 'chaotic', face: 'tangent', hold: 0.8,
    desc: 'Shapes are dropped into Thomas’ cyclically symmetric flow and simply advect. Deterministic, never repeating, bounded by construction — and the one pattern that leans hardest on the governor, since the flow decides its own spread.',
    stateful: true,
    pos: function (i, n, t, s, R, o) {
      o.copy(thomasPts[i]).multiplyScalar(R * 0.23);
    },
    tangent: function (i, n, t, s, R, o) {
      var p = thomasPts[i], b = 0.1998;
      o.set(Math.sin(p.y) - b * p.x, Math.sin(p.z) - b * p.y, Math.sin(p.x) - b * p.z);
    },
    scl: function (i, n, t, s) { return s.size * 1.1; }
  },
  {
    id: 'burst', name: 'Collapse & Burst', kind: 'chaotic', face: 'spin', hold: 0.5,
    desc: 'A cubed ease draws the cluster in and throws it wide again. The collapse stops at 55% of the envelope and the shapes swell as they gather, so the implosion reads as a clench rather than a disappearance.',
    punchy: true,
    pos: function (i, n, t, s, R, o) {
      var e = 0.5 + 0.5 * Math.sin(t * 0.5 + s.a * 0.1);
      var k = e * e * e;
      o.copy(s.dir).multiplyScalar(R * (0.55 + 0.6 * k));
      o.x += Math.sin(t * 2.1 + s.a) * R * 0.1 * k;
      o.y += Math.sin(t * 1.8 + s.b) * R * 0.1 * k;
    },
    // Inverse of the collapse: tightest is also biggest, which is what holds
    // the covered area steady through the clench.
    scl: function (i, n, t, s) {
      var e = 0.5 + 0.5 * Math.sin(t * 0.5 + s.a * 0.1);
      return s.size * (1.45 - 0.55 * e * e * e);
    }
  },
  {
    id: 'mirror', name: 'Mirror Pairs', kind: 'geometric', face: 'align', hold: 0.55,
    desc: 'Shapes couple up and hold exact point symmetry across the origin, each pair orbiting its own plane at its own rate while the gap between partners breathes.',
    pos: function (i, n, t, s, R, o) {
      var pair = Math.floor(i / 2), sign = (i % 2) ? -1 : 1;
      var rad = R * (0.74 + 0.22 * Math.sin(t * 0.36 + pair * 1.1));
      var th = t * (0.3 + pair * 0.11) + s.a;
      o.copy(s.e1).multiplyScalar(Math.cos(th) * rad).addScaledVector(s.e2, Math.sin(th) * rad);
      o.multiplyScalar(sign);
    },
    scl: function () { return 1.05; }
  },
  {
    id: 'grid', name: 'Grid Wave', kind: 'geometric', face: 'camera', hold: 0.25,
    desc: 'The cluster flattens into a camera-facing grid and a sine sweeps across it in depth. The column count tracks the shape count so the grid stays roughly square, and it cancels the group’s spin so it never turns edge-on.',
    planar: true,
    pos: function (i, n, t, s, R, o, ctx) {
      var cols = gridCols(n), rows = Math.ceil(n / cols);
      var c = i % cols, r = Math.floor(i / cols);
      var ph = t * 1.0 - c * 0.72 + r * 0.42;
      o.set(
        (c - (cols - 1) / 2) * R * 0.62,
        ((rows - 1) / 2 - r) * R * 0.66,
        Math.sin(ph) * R * 0.3
      );
      o.applyAxisAngle(AX_Y, -ctx.yaw);
    },
    scl: function (i, n, t, s) {
      return 0.95 + 0.25 * Math.sin(t * 1.0 - (i % gridCols(n)) * 0.72);
    }
  },
  {
    id: 'comet', name: 'Comet Trail', kind: 'organic', face: 'tangent', hold: 0.7,
    desc: 'One curve through the cluster volume, every shape reading it a fixed interval behind the one in front. Braided laterally off each shape’s own offset, so the single file still covers width instead of drawing a wire.',
    pos: function (i, n, t, s, R, o) {
      var u = t * 0.6 - i * 0.13;
      o.set(
        Math.sin(u * 1.1) * R * 0.8,
        Math.sin(u * 0.7 + 1.3) * R * 0.66,
        Math.cos(u * 0.9) * R * 0.8
      );
      // Ten shapes on one curve draw a wire, and a wire is not a backing.
      // The offset widens with index, so the head stays tight and the tail
      // opens into a cone -- which is what a comet does anyway.
      var spread = R * (0.16 + i * 0.075);
      o.addScaledVector(s.e1, s.lat * spread);
      o.addScaledVector(s.e2, Math.cos(s.a) * spread * 0.8);
    },
    scl: function (i, n, t, s) { return Math.max(0.62, 1.3 - i * 0.055); }
  }
];


export {
  PATTERNS,
  buildSeeds,
  thomasReset,
  thomasStep,
  gridCols,
  governor,
  newGovernor,
  TARGET_MAJ,
  TARGET_MIN,
  TAU,
};
