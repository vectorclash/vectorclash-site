import { useRef, useEffect, useState, useMemo, Suspense } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import gsap from 'gsap';
import WireframeBox from './WireframeBox';
import ShapeSwarm from './ShapeSwarm';
import BrightCluster from './BrightCluster';
import ParticleField from './ParticleField';
import GradientGenerator from '../../utils/GradientGenerator';
import StarLarge from '../../../images/star-sprite-large.png';
import StarSmall from '../../../images/star-sprite-small.png';
import { latchedSettings, getLevel, holdQuality } from '../../utils/qualityLevel';
import useQuality from '../../utils/useQuality';
import useRetiringCount from '../../utils/useRetiringCount';
import useRenderWhenVisible from '../../utils/useRenderWhenVisible';
import QualityGovernor from './QualityGovernor';

// Hoisted so these stay referentially stable across renders — ParticleField and
// ShapeSwarm memoize their random positions against the containerSize object, so
// a fresh literal each render would re-scatter every particle.
const SWARM_LARGE = { x: 120, y: 200, z: 50 };
const SWARM_SMALL = { x: 30, y: 75, z: 20 };
const SMALL_STAR_FIELD = { x: 150, y: 200, z: 350 };
const LARGE_STAR_FIELD = { x: 120, y: 150, z: 300 };

// GradientGenerator hands back 3-6 stops, but a 3-stop palette cannot
// cross-dissolve against a 5-stop one slot for slot. Resampling every palette
// onto a fixed number of slots makes any two of them interchangeable.
const COLOR_SLOTS = 8;

// Two stops reads as a calm single wash; five is as busy as the field wants
// to get. The old 3-6 range put four or more hues on screen at all times.
const randomColorCount = () => 2 + Math.round(Math.random() * 3);

const TAU = Math.PI * 2;

// Where each colour source sits and how it drifts. These depend only on time
// and aspect ratio -- they are the same for every pixel on the screen -- so
// they are solved once a frame here rather than per fragment. Each entry is a
// resting point, an orbit rate and a phase, per axis.
const SOURCE_ORBITS = Array.from({ length: COLOR_SLOTS }, (_, i) => {
  const h = (i * 0.6180339887 + 0.1394) % 1;
  const h2 = (i * 0.3819660113 + 0.7215) % 1;

  return {
    x: 0.5 + 0.33 * Math.cos(TAU * h),
    y: 0.5 + 0.33 * Math.sin(TAU * h2),
    rateX: 0.10 + 0.05 * h,
    rateY: 0.08 + 0.06 * h2,
    phaseX: TAU * h,
    phaseY: TAU * h2,
  };
});

// Interpolating colour in sRGB drags any blend between two distant hues
// through a washed-out middle -- the grey-brown band that shows up halfway
// along a ramp between, say, a blue stop and an orange one. OKLab puts the
// midpoint of two stops where the eye expects it, and being a linear space the
// mesh field's weighted average of eight sources stays meaningful. Slots are
// uploaded as OKLab and converted back once, at the end of the shader.
function linearToOklab(r, g, b) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}

function oklabToLinear([L, A, B]) {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.2914855480 * B) ** 3;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

function oklabSlots(colors) {
  const stops = colors.map((c) => {
    const col = new THREE.Color(c.toHexString());
    return linearToOklab(col.r, col.g, col.b);
  });
  const out = new Float32Array(COLOR_SLOTS * 3);

  for (let i = 0; i < COLOR_SLOTS; i++) {
    const x = (i / (COLOR_SLOTS - 1)) * (stops.length - 1);
    const lo = stops[Math.floor(x)];
    const hi = stops[Math.min(Math.ceil(x), stops.length - 1)];
    const f = x - Math.floor(x);

    for (let k = 0; k < 3; k++) {
      out[i * 3 + k] = lo[k] + (hi[k] - lo[k]) * f;
    }
  }

  return out;
}

// Neither field has a single middle stop the way a plain ramp did, so the fog,
// the fill light and the CSS fallback take an average of the whole palette.
// Averaged in linear light it came out brighter than the field it was standing
// in for -- linear is how light adds up, not how a screenful of colour looks --
// so the clear colour and the CSS gradient sat above the shader and the
// handover between them read as a dimming. The average is taken in OKLab, the
// same space the field mixes in, which puts it where the eye puts it. Stops
// are still weighted towards the lighter end, so a palette with one bright
// stop in it does not average away to its shadows.
function paletteAverage(colors) {
  const acc = [0, 0, 0];
  let total = 0;

  colors.forEach((c) => {
    const col = new THREE.Color(c.toHexString());
    const lab = linearToOklab(col.r, col.g, col.b);
    const weight = lab[0] + 0.05;

    for (let k = 0; k < 3; k++) acc[k] += lab[k] * weight;
    total += weight;
  });

  const [r, g, b] = oklabToLinear(acc.map((v) => v / total));

  return `#${new THREE.Color()
    .setRGB(Math.max(r, 0), Math.max(g, 0), Math.max(b, 0), THREE.LinearSRGBColorSpace)
    .getHexString()}`;
}

// Fog should match the field -- blending the far edge of the scene into the
// background is the whole job. The line work and the fill light should not:
// now that a palette can key deep, its average is close to black, and the
// wireframe and the swarm would go down with it. They take the field's hue,
// lifted to a level they stay readable against it at.
const ACCENT_FLOOR = 0.58;
// Held in a band rather than only floored: lifting a saturated hue to a
// readable lightness without capping it turns the wireframe neon.
const ACCENT_CHROMA = [0.35, 0.7];

function paletteAccent(hex) {
  const col = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };

  col.getHSL(hsl, THREE.SRGBColorSpace);
  col.setHSL(
    hsl.h,
    Math.min(Math.max(hsl.s, ACCENT_CHROMA[0]), ACCENT_CHROMA[1]),
    Math.max(hsl.l, ACCENT_FLOOR),
    THREE.SRGBColorSpace
  );

  return `#${col.getHexString()}`;
}

// The hero runs two fields, and both map the palette to *screen* space rather
// than to the UVs of the backdrop plane: the original shader spread its stops
// across a 5000-unit plane while the camera only ever framed ~1074 units of it,
// so the hero showed a thin slice of the ramp -- on a phone, a slice narrow
// enough to land inside a single stop.
//
//   calm   a linear gradient across the viewport, turning slowly on its axis
//          while it slides along itself. Quiet, and by far the cheaper.
//   chaos  the same eight colours as loose sources on slow independent orbits,
//          blended by inverse-square weight and shaded with a little noise.
//
// Neither has a change event. A strip of palettes runs end to end and both
// fields consume it continuously, at the same rate -- the calm field slides
// along the strip, and the chaos field, having no direction to slide along,
// rotates each of its sources round the hue wheel to its counterpart in place.
// So the two always hold the same palette and differ only in how it is arranged,
// which is what lets one be mixed into the other without inventing any colour
// that is not already on screen.
//
// Both are compiled into one program and uChaos picks between them. Two
// materials would mean a shader recompile at every transition, which stalls --
// the same reason the noise octave count is latched. The branch is on a
// uniform, so every fragment in the draw takes the same side of it and the
// chaos field costs nothing at all while uChaos is zero.
// Only the chaos field needs noise, but it is always compiled in -- see above.
const NOISE_HELPERS = (octaves) => `
        float hash21(vec2 p) {
          p = fract(p * vec2(123.34, 345.45));
          p += dot(p, p + 34.345);
          return fract(p.x * p.y);
        }

        float vnoise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash21(i), b = hash21(i + vec2(1.0, 0.0));
          float c = hash21(i + vec2(0.0, 1.0)), d = hash21(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        float fbm(vec2 p) {
          float s = 0.0, a = 0.5;
          for (int k = 0; k < ${octaves}; k++) {
            s += a * vnoise(p);
            p *= 2.03;
            a *= 0.5;
          }
          return s;
        }
`;

const FIELDS = `
        vec3 calmField() {
          vec2 p = gl_FragCoord.xy / uRes - 0.5;

          // Dividing by |cos| + |sin| normalises the diagonal back to 0-1,
          // which is what keeps every stop on screen at any angle or aspect
          // ratio. The axis itself turns -- see uAngle -- so the direction the
          // colour flows in is never fixed for long.
          float ca = cos(uAngle), sa = sin(uAngle);
          float d = (p.x * ca + p.y * sa) / (abs(ca) + abs(sa)) + 0.5;

          return palSlide(d);
        }

        vec3 chaosField() {
          vec2 uv = gl_FragCoord.xy / uRes;
          float aspect = uRes.x / uRes.y;
          vec2 p = vec2(uv.x * aspect, uv.y);

          vec3 acc = vec3(0.0);
          float wsum = 0.0;
          for (int i = 0; i < ${COLOR_SLOTS}; i++) {
            vec2 sp = uSources[i];
            float d2 = dot(p - sp, p - sp);
            float w = 1.0 / pow(d2 + 0.010, 1.30);
            acc += uChaosStops[i] * w;
            wsum += w;
          }
          vec3 col = acc / wsum;

          // Slow luminance turbulence, so the blend has some weather in it.
          // Only OKLab's L is scaled: scaling the whole triple would drag the
          // a/b axes towards zero and wash the hue out along with it.
          float n = fbm(p * 1.15 + vec2(uTime * 0.02, uTime * -0.015));
          col.x *= 0.93 + 0.14 * n;

          return col;
        }

        void main() {
          // uChaos is a uniform, so the whole draw takes one side of this and
          // there is no divergence to pay for. The middle case is the only one
          // that evaluates both fields, and it is only reached while a
          // transition is actually running.
          vec3 col;

          if (uChaos <= 0.0) {
            col = calmField();
          } else if (uChaos >= 1.0) {
            col = chaosField();
          } else {
            // Mixed in OKLab, and both fields are drawing the same palette at
            // the same instant -- so nothing on screen during the crossing is a
            // colour that was not already there. Only the arrangement moves.
            col = mix(calmField(), chaosField(), uChaos);
          }

          fragColor = vec4(present(col), 1.0);
        }
`;

// How wide the seam between two palettes is, measured in stop widths -- one
// stop width being a seventh of the viewport. The strip is read as a single
// gradient, so one palette's last stop and the next one's first are joined by
// an ordinary segment; widening that segment is what keeps an arriving palette
// from having a front. Too narrow and the handover reads as an edge crossing
// the screen. At four -- over half the viewport, and more than half a palette's
// own width -- each palette gets the screen to itself before the next one is
// anywhere near it, and the spacing between palettes is close enough to the
// spacing within them that the flow keeps one rhythm.
const JOIN = 4;

// One palette plus the seam that follows it: the strip's repeat length.
const SPAN = COLOR_SLOTS - 1;
const CELL = SPAN + JOIN;

// The seam used to be one wide segment with its own interpolation, which made
// the strip a sequence of unevenly spaced stops -- and an interpolant can only
// be smooth across a knot if it knows where the next knot is. The seam is now
// spanned by ordinary stops at the same unit spacing as everything else, so the
// whole strip is one evenly knotted sequence and a single curve runs the length
// of it. That is what JOIN being a whole number buys.
const SEAM_STOPS = JOIN - 1;

// The window opens on cell 1 and travels one cell before the strip shifts, so
// it covers cells 1 and 2. Cell 0 is the history the curve's trailing tap
// reaches back into, and cell 3 is the lookahead that lets cell 2's seam be
// written before it is ever on screen.
const STRIP_CELLS = 4;
const STRIP_STOPS = STRIP_CELLS * CELL;
const CELL_FLOATS = CELL * 3;

const newPalette = () =>
  oklabSlots(new GradientGenerator(randomColorCount(), false, true).colors);

// A stop with no hue of its own reads as the red axis out of atan2, so it would
// swing through reds on its way to a chromatic partner. Below this chroma it
// borrows the other end's hue instead.
const NEUTRAL = 0.004;

// Travels one OKLab colour to another round the hue wheel rather than straight
// across it.
//
// Mixing two saturated colours straight takes the result through a duller
// middle to get where it is going: a line between two distant hues passes near
// the neutral axis, so the pair loses chroma halfway however soft the blend is
// -- the grey-brown band. Read in polar OKLab a colour has a hue angle and a
// chroma, and it can rotate to its new hue, the short way, holding its chroma
// the whole way. The colour turns rather than being replaced, and it never
// passes through grey to do it.
//
// This used to live in the shader. Both of its callers work in quantities that
// are the same for every pixel on the screen, so neither ever needed it there.
function polarBlend(out, o, src, a, b, t) {
  const ca = Math.hypot(src[a + 1], src[a + 2]);
  const cb = Math.hypot(src[b + 1], src[b + 2]);
  let ha = Math.atan2(src[a + 2], src[a + 1]);
  let hb = Math.atan2(src[b + 2], src[b + 1]);

  if (ca < NEUTRAL) ha = hb;
  if (cb < NEUTRAL) hb = ha;

  // Wrapped into -PI..PI, so a colour always takes the shorter arc rather than
  // unwinding the long way round the wheel.
  const dh = (((hb - ha + Math.PI) % TAU) + TAU) % TAU - Math.PI;
  const chroma = ca + (cb - ca) * t;
  const hue = ha + dh * t;

  out[o] = src[a] + (src[b] - src[a]) * t;
  out[o + 1] = chroma * Math.cos(hue);
  out[o + 2] = chroma * Math.sin(hue);
}

// Fills in the stops spanning the seam that follows a cell. This is the one
// pair on the strip that can be anywhere on the hue wheel from each other -- a
// palette's own stops are close together by construction -- so the seam is the
// one place that has to travel round the wheel.
//
// It runs once per palette, because the result is just more stops: the shader
// reads them the same way it reads every other stop and no longer needs to know
// a seam exists.
function writeSeam(strip, cell) {
  const a = (cell * CELL + SPAN) * 3;
  const b = (cell + 1) * CELL_FLOATS;

  for (let k = 1; k <= SEAM_STOPS; k++) {
    polarBlend(strip, (cell * CELL + SPAN + k) * 3, strip, a, b, k / JOIN);
  }
}

// How far apart the chaos field's slots go as they turn over: enough that the
// turnover is not a single event, not so much that the field carries two
// unrelated palettes at once.
const CHAOS_STAGGER = 0.3;

// The chaos field's eight colours. It has no axis to slide along, so it
// consumes the strip in place: every slot rotates from the palette the strip is
// on to the one after it, each slot trailing the one before it a little, so the
// field turns over stop by stop rather than in one piece. One turnover per cell
// of travel, which is the rate the calm field gets through palettes at -- and it
// completes just before the strip shifts, so the shift lands on a field already
// showing the palette it is about to promote, and is invisible for the same
// reason it is on the calm field.
//
// Eight colours, once a frame, for the whole screen.
function writeChaosStops(out, strip, offset) {
  const phase = offset / CELL;

  for (let i = 0; i < COLOR_SLOTS; i++) {
    const lead = (i / (COLOR_SLOTS - 1)) * CHAOS_STAGGER;
    const t = Math.min(Math.max(phase * (1 + CHAOS_STAGGER) - lead, 0), 1);

    // Cells 1 and 2: the one the window is on and the one after it.
    polarBlend(out, i * 3, strip, (CELL + i) * 3, (2 * CELL + i) * 3, t);
  }
}

// The strip as it starts: the palette the hero was handed in cell 1, where
// the window opens, with fresh ones around it. Cell 3's own seam is left unset
// because nothing can reach it -- it is overwritten on the shift that would
// bring it into range.
function seedStrip(slots) {
  const strip = new Float32Array(STRIP_STOPS * 3);

  strip.set(newPalette(), 0);
  strip.set(slots, CELL_FLOATS);
  for (let cell = 2; cell < STRIP_CELLS; cell++) strip.set(newPalette(), cell * CELL_FLOATS);
  for (let cell = 0; cell < STRIP_CELLS - 1; cell++) writeSeam(strip, cell);

  return strip;
}

// Drops the oldest cell off the front and rolls a fresh palette onto the back,
// which puts the window back where it started in front of a strip that has
// moved instead. The new cell's palette has to land before the seam that leads
// into it can be drawn.
function advanceStrip(strip) {
  strip.copyWithin(0, CELL_FLOATS);
  strip.set(newPalette(), (STRIP_CELLS - 1) * CELL_FLOATS);
  writeSeam(strip, STRIP_CELLS - 2);
}

// How fast the window travels along the strip, in stop widths per second, with
// the wander sitting at nothing. At this pace a palette crosses the screen in
// something under twenty seconds and the next one is fully in frame inside
// thirty. That is the "generally very slow" the field is after: slow enough
// that a still frame looks still, quick enough that a glance back a minute
// later finds a gradient that has moved on.
// Nominal rather than average: exp() of a symmetric wander averages above one,
// so the flow runs about a tenth quicker over time than this number reads.
const FLOW_RATE = 0.36;

// How far the wander pushes that rate either side of nominal, as a factor.
// Exponential rather than additive: it cannot drive the flow backwards or stop
// it dead, and a slowing feels like the mirror of a quickening rather than a
// smaller version of it. At 1.0 the flow ranges from about a third of nominal
// to about three times it, so the palettes are sometimes barely creeping and
// sometimes moving with purpose, and never doing either for long.
const FLOW_SWING = 1.0;

// Where the gradient's axis points: a drift it cannot escape, plus a swing it
// wanders through on the way.
//
// This was an integrated turn rate, and the rate was a wander -- which meant the
// axis never went anywhere. A bounded zero-mean rate integrates to a bounded
// angle: at the old rate and the flow's periods the excursion worked out to
// 2.28 + 0.71 + 0.20 degrees, so the axis picked an orientation at random on
// load and then held it, to within three degrees, for the rest of the session.
// It rocked either side of a fixed heading, which is the one thing it was
// written not to do.
//
// TURN_DRIFT is the term that has no bound on it: a full turn every ten and a
// half minutes of net travel. TURN_SWING is wide enough, and TURN_PERIODS slow
// enough, that the axis is not sweeping steadily -- the direction reverses about
// once a minute, whenever the swing's slope beats the drift, and the axis covers
// a median of 39 degrees in a minute while doing it.
const TURN_DRIFT = 0.01;
const TURN_SWING = 1.2;

// A smooth -1..1 wander: three sines whose periods are close to coprime, so
// they come back into step only after a span measured in hours and nothing
// anyone sits through repeats. Being a sum of sines it is smooth in value and
// in slope, which is what keeps a change from arriving as a kick --
// interpolating between random targets is the obvious alternative and it kinks
// at every target.
//
// What a wander cannot do is go anywhere. It is zero-mean and bounded, and so
// is its integral: integrate one as a rate and the result swings by rate times
// amplitude times period over 2pi and no further, however long you wait. The
// flow gets around that by being exponential in the wander rather than
// proportional to it, which is never negative, so its integral only ever
// climbs. The axis needs a term of its own -- see TURN_DRIFT.
//
// Phases are rolled per caller, so the flow and the turn are independent of
// each other, and two loads of the page are not in step.
const WANDER_WEIGHTS = [0.55, 0.3, 0.15];

function makeWander(periods) {
  const phases = periods.map(() => Math.random() * TAU);

  return (time) => {
    let sum = 0;

    for (let i = 0; i < periods.length; i++) {
      sum += Math.sin((TAU * time) / periods[i] + phases[i]) * WANDER_WEIGHTS[i];
    }

    return sum;
  };
}

// The flow's wander turns over in tens of seconds; the axis wants minutes.
const FLOW_PERIODS = [41.3, 23.7, 13.1];
const TURN_PERIODS = [313, 197, 89];

// The palettes strung end to end, sampled as one continuous gradient. The
// viewport is a window one palette wide onto that strip, and it never stops
// moving: uOffset walks it forward for as long as the hero is on screen, so
// the colour is always leaving one side of the screen while more of it arrives
// from the other. There is no change event and nothing crossfades -- a palette
// is simply what the window happens to be framing at the time.
//
// uOffset only ever covers one CELL. Once it has, the strip is shifted down by
// a palette and a fresh one is rolled onto the end, which puts the window back
// where it started in front of a strip that has moved instead. Both sides of
// that shift frame the same colours, so it is invisible, and the strip stays
// three palettes long however long the page is left open.
//
// Within a palette the stops mix straight, which is the gradient the hero has
// always drawn. Only the seams blend polar, because those are the pairs that
// can be anywhere on the wheel from each other, and a straight mix between
// opposites passes through grey on the way.
const RAMP_PALETTE = `
        const float SPAN = float(${SPAN});
        const float CELL = float(${CELL});

        // A uniform cubic B-spline through the strip's stops.
        //
        // Every stop used to be joined to the next by a smoothstep, which stops
        // the colour dead at each stop and then runs it through the middle of
        // the segment at one and a half times the average rate. The stops are a
        // linear resample of the palette, so the ramp they describe is straight
        // -- and smoothstep was corrugating that straight line into seven
        // pulses across the screen, one per segment, each with a flat either
        // side of it. That is the line between the stops, and the fuzz is the
        // dither sitting on the flats where nothing else is moving.
        //
        // A B-spline reproduces a straight line exactly, so a plain ramp comes
        // out plain. It is also smooth in curvature, not just in slope, which
        // is what the eye needs to stop finding an edge: a curvature step is
        // what a Mach band is made of. The only place the curve leaves the
        // stops is where the palette genuinely turns a corner, and rounding
        // that corner off is the whole point.
        vec3 stripAt(float x) {
          // Clamped so the four taps stay on the array whatever x does. The
          // window never comes near either end; this is for the rounding error.
          float xc = clamp(x, 1.0, float(${STRIP_STOPS - 3}));
          float i = floor(xc);
          float f = xc - i;
          int b = int(i) - 1;

          float f2 = f * f;
          float f3 = f2 * f;

          return (
              uStrip[b]     * (1.0 - 3.0 * f + 3.0 * f2 -       f3)
            + uStrip[b + 1] * (4.0           - 6.0 * f2 + 3.0 * f3)
            + uStrip[b + 2] * (1.0 + 3.0 * f + 3.0 * f2 - 3.0 * f3)
            + uStrip[b + 3] *                                   f3
          ) / 6.0;
        }

        // The window opens one cell into the strip, so the spline's trailing
        // tap always has real colour behind it.
        vec3 palSlide(float t) {
          return stripAt(CELL + uOffset + clamp(t, 0.0, 1.0) * SPAN);
        }
`;

function buildFragmentShader(octaves) {
  return `
        uniform float uTime;
        uniform vec2  uRes;
        // How far the window has travelled into the current palette, in stop
        // widths. It covers one CELL and then the strip shifts underneath it.
        uniform float uOffset;
        // The gradient's axis, in radians. Driven on the CPU so it can
        // integrate a wandering turn rate and actually go round, rather than
        // rocking either side of a fixed heading.
        uniform float uAngle;
        uniform vec3  uStrip[${STRIP_STOPS}];
        // How far into a chaos episode the hero is: 0 calm, 1 full chaos.
        uniform float uChaos;
        // Both solved on the CPU once a frame. The source positions depend only
        // on time and aspect ratio, and the chaos field's eight colours depend
        // only on uOffset -- neither varies from one pixel to the next, so
        // neither belongs in a fragment shader. The colours used to be worked
        // out per pixel: eight polar blends, each with two atan, a cos and a
        // sin, recomputed a few million times a frame to arrive at the same
        // eight answers. See SOURCE_ORBITS and writeChaosStops.
        uniform vec2  uSources[${COLOR_SLOTS}];
        uniform vec3  uChaosStops[${COLOR_SLOTS}];

        // GLSL3 leaves the fragment output to the material, so declare it.
        layout(location = 0) out vec4 fragColor;

${NOISE_HELPERS(octaves)}${RAMP_PALETTE}

        // Interleaved gradient noise. The obvious hash(gl_FragCoord) dither
        // takes coordinates in the thousands, where a fract-based hash loses
        // precision and collapses into a visible moire grid. This one is built
        // for pixel coordinates and stays stable across the whole viewport.
        float dither(vec2 fragCoord) {
          return fract(52.9829189 * fract(dot(fragCoord, vec2(0.06711056, 0.00583715))));
        }

        vec3 oklabToLinear(vec3 c) {
          float l_ = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
          float m_ = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
          float s_ = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
          vec3 lms = vec3(l_ * l_ * l_, m_ * m_ * m_, s_ * s_ * s_);

          return mat3(
             4.0767416621, -1.2684380046, -0.0041960863,
            -3.3077115913,  2.6097574011, -0.7034186147,
             0.2309699292, -0.3413193965,  1.7076147010
          ) * lms;
        }

        // The field mixes in OKLab; the screen wants sRGB. Three injects its
        // linear-to-sRGB encode into built-in materials only, never into a
        // ShaderMaterial, so a raw shader has to carry it. Without this every
        // value written lands about a stop and a half dark -- which barely
        // touches a fully saturated stop, whose channels sit at 0 or 1, but
        // turns any midtone to mud. That is what the palette's shaded stops
        // were hitting.
        vec3 present(vec3 lab) {
          vec3 lin = max(oklabToLinear(lab), 0.0);
          vec3 srgb = mix(
            lin * 12.92,
            1.055 * pow(lin, vec3(1.0 / 2.4)) - 0.055,
            step(vec3(0.0031308), lin)
          );

          // A grain of dither, which keeps the wide soft blend off banding.
          // Sized at about one and a half steps of an 8-bit channel: enough to
          // break up a quantisation edge, which is all it is for. It was at
          // nearly four, which is visible as grain in its own right -- that was
          // covering for the flats the old interpolation left at every stop,
          // and the spline has taken those away.
          return srgb + (dither(gl_FragCoord.xy) - 0.5) * 0.006;
        }
${FIELDS}      `;
}

// A chaos episode, in seconds of *rendered* time. Every clock in this field is
// integrated from dt rather than read off a wall clock, so nothing accrues while
// the hero is scrolled out of view and parked -- an episode cannot happen with
// nobody watching, and cannot be half over by the time the hero comes back.
//
// The gap between episodes is drawn from an exponential rather than picked out
// of a range. A gap uniform between four and nine minutes is unpredictable in
// the sense that you cannot say which it will be, but every gap comes out
// roughly the same size, and a thing that happens at roughly regular intervals
// reads as a cycle however random the interval was. An exponential is
// memoryless: the chance of an episode starting is the same in any given
// second, whatever has just happened. So the gaps cluster -- two episodes come
// close together, then nothing for a long while -- which is what now and then
// actually looks like.
//
// CALM_MEAN is the exponential's own mean, not the gap's. The floor keeps two
// episodes from running into each other -- the fall alone is twenty seconds, so
// a floor much under this leaves no stretch of settled ramp between them at all
// -- and the ceiling keeps the long tail from reading as the background having
// stopped. Between them the gap averages a little under three minutes, with
// most of them shorter than that and the occasional drought of six or seven.
const CALM_MEAN = 120;
const CALM_FLOOR = 45;
const CALM_CEIL = 420;

const calmSpell = () =>
  Math.min(CALM_FLOOR + -Math.log(1 - Math.random()) * CALM_MEAN, CALM_CEIL);

// The opening wait does a different job from the gaps that follow it, and was
// being asked to do it with the gaps' numbers. A gap sets a rhythm for someone
// who has settled in; this one is the only thing standing between an ordinary
// visit and ever seeing an episode at all. At the gap's floor that made it
// impossible rather than unlikely -- the clock only advances on rendered
// frames, so forty-five seconds means forty-five seconds of looking at the
// hero, and anyone who scrolls on before then could not see one however long
// they stayed on the site. Past that first wait an episode is running about a
// quarter of the time, so the effect was never too rare. The wait for the first
// one was too long.
//
// Drawn shorter and capped much closer, then, so half a minute of attention has
// a real chance of catching one. The floor still clears the hero's own entrance
// -- the cluster is six seconds arriving, and an episode landing on top of that
// would be two things at once in the moment there is most to look at.
const FIRST_MEAN = 25;
const FIRST_FLOOR = 20;
const FIRST_CEIL = 90;

const firstSpell = () =>
  Math.min(FIRST_FLOOR + -Math.log(1 - Math.random()) * FIRST_MEAN, FIRST_CEIL);

const CHAOS_HOLD = [12, 26];

// It leaves more slowly than it arrives. Coming apart can afford to be the
// quicker half -- that is the part with the interest in it -- but settling back
// wants to be slow enough that there is no moment you could point at and call
// the end of it.
const CHAOS_RISE = 14;
const CHAOS_FALL = 20;

// Smootherstep rather than smoothstep: zero curvature at both ends as well as
// zero slope, so neither the departure from calm nor the return to it has an
// edge the eye can find. The same reasoning as the ramp's spline.
const smootherstep = (t) => t * t * t * (t * (t * 6 - 15) + 10);

const randIn = ([lo, hi]) => lo + Math.random() * (hi - lo);

// A frame this long, this many times in a row, means the device cannot carry
// the chaos field -- about three seconds of genuinely bad frames. Measured on
// the raw delta, not the clamped one, and the count resets on any good frame, so
// a single stall on resume or a garbage collection does not trip it.
const CHAOS_SLOW_FRAME = 1 / 34;
const CHAOS_SLOW_LIMIT = 90;

const newChaos = () => ({
  phase: 'calm',
  t: 0,
  span: firstSpell(),
  slow: 0,
  given: false,
  // Whether the opening wait is still being served. It survives a wait that
  // expires without an episode, because such a wait was declined rather than
  // spent -- see stepChaos.
  first: true,
});

/**
 * Advances the episode clock and answers how much chaos is on screen, 0 to 1.
 *
 * The device gets a veto in both directions. An episode only starts on hardware
 * that measured its way to the top of the quality ladder, and if one turns out
 * to be too expensive anyway it is cut short and no more are scheduled for the
 * rest of the session. That matters because the ladder is held still while an
 * episode runs -- the governor cannot be allowed to read an episode as a slow
 * device -- so this is the only thing watching, and something has to be.
 */
function stepChaos(c, dt, raw) {
  c.t += dt;

  if (c.phase === 'calm') {
    if (c.t < c.span) return 0;

    c.t = 0;

    // Given up on: nothing will start again this session, so the span only has
    // to be something to count down.
    if (c.given) {
      c.span = calmSpell();
      return 0;
    }

    // Not at the top of the ladder yet. That is a not-yet rather than a no --
    // the governor takes three seconds to reach its first verdict and climbs a
    // rung at a time, so a device that will get there may simply not have got
    // there. Falling back to a full gap here would spend the short opening wait
    // on a check that was never going to pass and put the first episode back
    // where it was, which is the whole thing this is meant to fix.
    if (getLevel() !== 'high') {
      c.span = c.first ? firstSpell() : calmSpell();
      return 0;
    }

    c.first = false;
    c.phase = 'rise';
    c.slow = 0;
    return 0;
  }

  if (c.phase === 'fall') {
    if (c.t < CHAOS_FALL) return 1 - smootherstep(c.t / CHAOS_FALL);

    c.phase = 'calm';
    c.t = 0;
    c.span = calmSpell();
    return 0;
  }

  // Rising or holding: the only two phases where giving up is still useful.
  c.slow = raw > CHAOS_SLOW_FRAME ? c.slow + 1 : 0;

  if (c.slow >= CHAOS_SLOW_LIMIT) {
    c.given = true;
    c.phase = 'fall';
    c.t = 0;
    return 1;
  }

  if (c.phase === 'rise') {
    if (c.t < CHAOS_RISE) return smootherstep(c.t / CHAOS_RISE);

    c.phase = 'hold';
    c.t = 0;
    c.span = randIn(CHAOS_HOLD);
    return 1;
  }

  if (c.t < c.span) return 1;

  c.phase = 'fall';
  c.t = 0;
  return 1;
}

// Animated gradient background. Calm nearly all of the time; see stepChaos.
function AnimatedGradientBackground({ colors }) {
  const resRef = useRef(new THREE.Vector2());
  const timeRef = useRef(0);
  // How far into the current palette the window sits, and the orientation the
  // axis starts from -- the axis is solved from that, the drift and the swing,
  // so this one is a constant rather than an accumulator.
  const offsetRef = useRef(0);
  const angleStartRef = useRef(Math.random() * TAU);
  const chaosRef = useRef(null);
  if (chaosRef.current === null) chaosRef.current = newChaos();

  const material = useMemo(() => {
    // GLSL3 so the colour arrays can be indexed by a loop variable through a
    // function parameter, which ES 1.00 forbids.
    //
    // Latched rather than adaptive: the octave count is baked into the source
    // as a loop bound, so changing it rebuilds the material and recompiles the
    // shader. Doing that mid-scroll drops frames on exactly the device that
    // needed the help.
    const octaves = latchedSettings().octaves;

    // Seeded here rather than in an effect. Zeroed colour uniforms render pure
    // black, and any frame that lands between the first render and the effect
    // commit would show it -- which is the black flash on a cold load.
    const slots = oklabSlots(colors);

    const uniforms = {
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uSources: { value: new Float32Array(COLOR_SLOTS * 2) },
      uChaosStops: { value: new Float32Array(COLOR_SLOTS * 3) },
      uChaos: { value: 0 },
      uOffset: { value: 0 },
      uAngle: { value: angleStartRef.current },
      // The hero opens on the palette it was handed, and the rest of the
      // strip is rolled straight away -- so the flow has somewhere to go from
      // the first frame, rather than creeping through two copies of the opening
      // gradient for the first minute.
      uStrip: { value: seedStrip(slots) },
    };

    return new THREE.ShaderMaterial({
      uniforms,
      glslVersion: THREE.GLSL3,
      vertexShader: `
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: buildFragmentShader(octaves),
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false,
    });
  }, [colors]);

  // Rolled per material so the flow and the turn are independent of each other
  // and of the page's other animations.
  const flowWander = useMemo(() => makeWander(FLOW_PERIODS), [material]);
  const turnWander = useMemo(() => makeWander(TURN_PERIODS), [material]);

  useEffect(() => () => material.dispose(), [material]);

  useFrame((state, delta) => {
    // r3f resets clock.elapsedTime to 0 whenever frameloop changes, so the
    // field keeps its own clock -- otherwise every source would snap back to
    // its starting position each time the hero scrolled into view.
    // Clamped to absorb the long first delta after a resume.
    const dt = Math.min(delta, 1 / 30);

    timeRef.current += dt;
    const time = timeRef.current;
    material.uniforms.uTime.value = time;

    const res = state.gl.getDrawingBufferSize(resRef.current);
    material.uniforms.uRes.value.set(res.x, res.y);

    // The axis is solved from the clock; the flow has to be integrated, because
    // its rate is exponential in the wander and there is no closed form for
    // where that has got to. Either way it is the field's own clock, which only
    // advances on rendered frames -- so both pick up where they left off when
    // the hero scrolls back into view, rather than jumping to wherever a wall
    // clock would have carried them.
    material.uniforms.uAngle.value =
      angleStartRef.current + TURN_DRIFT * time + TURN_SWING * turnWander(time);

    offsetRef.current += FLOW_RATE * Math.exp(flowWander(time) * FLOW_SWING) * dt;

    // The window has crossed into the next palette, so the strip comes to it:
    // everything shifts down one and a fresh palette is rolled onto the end,
    // two palettes clear of the screen. A while rather than an if -- a single
    // frame cannot outrun a whole CELL at these rates, but the loop costs
    // nothing and is the honest way to write a wrap.
    while (offsetRef.current >= CELL) {
      offsetRef.current -= CELL;
      advanceStrip(material.uniforms.uStrip.value);
    }

    material.uniforms.uOffset.value = offsetRef.current;

    const chaos = stepChaos(chaosRef.current, dt, delta);
    material.uniforms.uChaos.value = chaos;

    if (chaos <= 0) return;

    // Everything below here is the chaos field's, and none of it runs while the
    // hero is calm.
    //
    // The ladder is held for four seconds at a time, renewed every frame the
    // field is on screen. Four outlasts one of the governor's sampling windows,
    // so the window that straddles the end of an episode is thrown out along
    // with the ones inside it -- otherwise the device would be judged on an
    // average half of which was drawn by a shader that is no longer running.
    holdQuality(4);

    const aspect = res.x / res.y;
    const sources = material.uniforms.uSources.value;

    for (let i = 0; i < COLOR_SLOTS; i++) {
      const orbit = SOURCE_ORBITS[i];
      sources[i * 2] = (orbit.x + 0.19 * Math.sin(time * orbit.rateX + orbit.phaseX)) * aspect;
      sources[i * 2 + 1] = orbit.y + 0.19 * Math.cos(time * orbit.rateY + orbit.phaseY);
    }

    writeChaosStops(material.uniforms.uChaosStops.value, material.uniforms.uStrip.value, offsetRef.current);
  });

  return (
    <mesh position={[0, 0, -800]} renderOrder={-1}>
      <planeGeometry args={[5000, 5000]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

// Fires once the renderer has actually produced a frame. onCreated is too
// early -- it runs when the GL context exists, before anything is drawn -- so
// revealing on it still showed one frame of bare clear colour.
function FirstFrameSignal({ onReady }) {
  const fired = useRef(false);

  useFrame(() => {
    if (fired.current) return;
    fired.current = true;
    onReady();
  });

  return null;
}

function Scene({ colors }) {
  const groupRef = useRef();
  // Select narrowly: useThree() with no selector subscribes to every store
  // change, so a canvas resize (e.g. the mobile address bar collapsing mid
  // scroll) would re-render the whole scene.
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const [starSmallImage, setStarSmallImage] = useState(null);
  const [starLargeImage, setStarLargeImage] = useState(null);

  const fogColor = useMemo(() => paletteAverage(colors), [colors]);
  const accentColor = useMemo(() => paletteAccent(fogColor), [fogColor]);

  const { settings } = useQuality();

  // Roll each field's size once, when the field is first created. Randomizing
  // inline in the JSX would hand every field a new size on any re-render,
  // visibly resizing stars mid-scroll -- and now that the count moves with the
  // quality level, re-renders are no longer rare.
  //
  // The counts come back as a list that only ever grows: a field the governor
  // has dropped stays mounted, flagged, until it has faded itself out. See
  // useRetiringCount.
  //
  // Each field also fixes its own particle count at creation. Quality is
  // expressed by how many fields are up, never by resizing a field that is
  // already drawn: the position buffer is derived from the count, so changing
  // it would re-roll three hundred stars into new places -- a teleport, not a
  // fade, and no amount of easing hides it.
  const [smallFields, releaseSmall] = useRetiringCount(settings.smallFields, () => ({
    size: 0.8 + Math.random() * 1.5,
    particles: settings.smallParticles,
  }));

  const [largeFields, releaseLarge] = useRetiringCount(settings.largeFields, () => ({
    size: 15 + Math.random() * 35,
    particles: settings.largeParticles,
  }));

  // Bloom stays on at every level, and the level decides what it costs instead.
  // The hero reads as a different animation with the pass off -- the stars and
  // the cluster are lit for it -- so cutting it outright was really shipping two
  // designs, and under the old detector the second one was what every phone got.
  // It is not the expensive thing here either: mipmapBlur is a fixed downsample
  // chain plus one composite, a handful of fullscreen passes at steadily smaller
  // sizes, none of it scaling with what is in the scene.
  //
  // Written straight onto the effect rather than through the prop, because the
  // prop is a constructor argument and changing it would rebuild the pass. The
  // setter resizes the chain's render targets, so it is a step and never a
  // tween -- resizing a buffer every frame for a second would cost more than
  // the pass does. Against a blur on its way to being blurred, a step between
  // scales is close to invisible anyway.
  const bloomRef = useRef();

  useEffect(() => {
    const resolution = bloomRef.current?.resolution;
    if (resolution) resolution.scale = settings.bloomScale;
  }, [settings.bloomScale]);

  useEffect(() => {
    // Load star images
    const loader = new THREE.ImageLoader();
    loader.load(StarSmall, setStarSmallImage);
    loader.load(StarLarge, setStarLargeImage);
  }, []);

  useEffect(() => {
    if (!groupRef.current) return;

    // Make visible and animate in
    gsap.to(groupRef.current, {
      duration: 0.1,
      delay: 0.5,
      onStart: () => {
        groupRef.current.visible = true;
      },
    });

    gsap.to(groupRef.current.scale, {
      duration: 6,
      x: 1,
      y: 1,
      z: 1,
      ease: 'back.out',
      delay: 1,
    });
  }, []);

  useEffect(() => {
    const scrollTarget = { offsetY: 0 };
    let cameraTween = null;
    let rotationTween = null;

    const handleScroll = () => {
      const parentElement = gl.domElement.parentNode;
      if (!parentElement) return;

      scrollTarget.offsetY = window.scrollY - parentElement.getBoundingClientRect().y;

      // Kill existing tweens to prevent buildup
      if (cameraTween) cameraTween.kill();
      if (rotationTween) rotationTween.kill();

      cameraTween = gsap.to(camera.position, {
        duration: 0.5,
        y: -scrollTarget.offsetY * 0.15,
        ease: 'quad.out',
      });

      rotationTween = gsap.to(groupRef.current.rotation, {
        duration: 0.5,
        y: -scrollTarget.offsetY * 0.0007,
        ease: 'quad.out',
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (cameraTween) cameraTween.kill();
      if (rotationTween) rotationTween.kill();
    };
  }, [camera, gl]);

  return (
    <>
      <AnimatedGradientBackground colors={colors} />
      <fog attach="fog" args={[fogColor, 1, 1000]} />
      <ambientLight intensity={0.2} color={0xfafafa} />
      <directionalLight intensity={0.2} color={accentColor} />

      <group ref={groupRef} scale={[0.00002, 0.00002, 0.00002]} visible={false}>
        <WireframeBox size={2000} depth={12} color={accentColor} />
        <ShapeSwarm amount={5} containerSize={SWARM_LARGE} />
        <ShapeSwarm amount={5} containerSize={SWARM_SMALL} />
        <Suspense fallback={null}>
          <BrightCluster />
        </Suspense>

        {/* Small particles - optimized for visibility in front of camera.
            Keyed by entry id rather than by index: a retiring field has to keep
            the same element across the re-render that flags it, or React
            unmounts it and the fade never runs. */}
        {starSmallImage &&
          smallFields.map(({ id, retiring, item }) => (
            <ParticleField
              key={`small-${id}`}
              particleNum={item.particles}
              image={starSmallImage}
              size={item.size}
              opacity={0.6}
              containerSize={SMALL_STAR_FIELD}
              retiring={retiring}
              onRetired={() => releaseSmall(id)}
            />
          ))}

        {/* Large particles - optimized for visibility */}
        {starLargeImage &&
          largeFields.map(({ id, retiring, item }) => (
            <ParticleField
              key={`large-${id}`}
              particleNum={item.particles}
              image={starLargeImage}
              size={item.size}
              opacity={0.8}
              containerSize={LARGE_STAR_FIELD}
              retiring={retiring}
              onRetired={() => releaseLarge(id)}
            />
          ))}
      </group>

      <QualityGovernor />

      {/* multisampling is latched, not adaptive: the prop is in the composer's
          construction dependencies, so changing it disposes the composer and
          all of its render targets and builds a new one. Worth noting that the
          old code never set it at all, which left it on the library default of
          8 -- full-size 8x MSAA on a half-float target, on every phone. */}
      <EffectComposer multisampling={latchedSettings().multisampling}>
        <Bloom
          ref={bloomRef}
          intensity={1}
          // Raised with the output encode. The background used to be written
          // unencoded and so sat well under the old threshold; now that it
          // lands at the brightness it was picked at, 0.3 would bloom the
          // whole field and haze the hero over. This keeps bloom on the
          // stars and the cluster, which is what it was ever for.
          luminanceThreshold={0.7}
          luminanceSmoothing={0.9}
          mipmapBlur
          // Constant, because the effect is memoized on its props and a change
          // here would rebuild it. The live value is written to the effect
          // directly, in the effect above.
          resolutionScale={latchedSettings().bloomScale}
        />
      </EffectComposer>
    </>
  );
}

export default function HeroScene({ colors, fallback, ready, onReady }) {
  const fallbackColor = paletteAverage(colors);
  const [canvasRef, frameloop] = useRenderWhenVisible();

  return (
    <Canvas
      ref={canvasRef}
      frameloop={frameloop}
      // Uncapped, this follows devicePixelRatio -- 2 on a retina laptop, which
      // is four times the fragment work for a soft gradient that cannot show
      // the difference. Only the starting value: QualityGovernor drives it from
      // here on, which is why this is a number rather than the old [1, 1.5]
      // range -- setDpr replaces the range outright the first time it runs, so
      // leaving a range here only disguises where the value really comes from.
      dpr={Math.min(latchedSettings().dpr, window.devicePixelRatio || 1)}
      camera={{ position: [0, 2, 130], fov: 60, near: 0.1, far: 20000 }}
      gl={{
        // No antialias flag. Every frame this scene draws goes through the
        // EffectComposer's own render target, so the backbuffer's MSAA setting
        // is never consulted -- the knob the old detector spent a tier on did
        // nothing. multisampling on the composer is the real control.
        alpha: false,
        physicallyCorrectLights: false,
        shadowMap: {
          enabled: true,
          type: THREE.PCFSoftShadowMap,
        },
      }}
      // Cross-fades up over the CSS gradient underneath, which carries the same
      // palette, so the handover reads as the field gaining depth rather than
      // as the background being replaced.
      // The transition itself lives in HeroBackground.scss, alongside
      // the gradient's, so the two are timed from one place.
      style={{ background: fallback || fallbackColor, opacity: ready ? 1 : 0 }}
      onCreated={({ gl }) => gl.setClearColor(fallbackColor)}
    >
      <FirstFrameSignal onReady={onReady} />
      <Scene colors={colors} />
    </Canvas>
  );
}
