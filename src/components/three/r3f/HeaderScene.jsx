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
import { latchedSettings } from '../../utils/qualityLevel';
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

// Which background field the header runs. Both map the palette to *screen*
// space rather than to the UVs of the backdrop plane: the original shader
// spread its stops across a 5000-unit plane while the camera only ever framed
// ~1074 units of it, so the header showed a thin slice of the ramp -- on a
// phone, a slice narrow enough to land inside a single stop.
//
//   'ramp'  a 42-degree linear gradient across the viewport, drifting in both
//           angle and offset. Quiet, and by far the cheaper of the two.
//   'mesh'  eight colour sources on slow independent orbits, blended by
//           inverse-square weight and shaded with a little noise. Much busier.
//
// Either way two palettes stay resident and uMix drives the same change: every
// 5-15s each slot rotates around the hue wheel to its counterpart over 7s,
// holding its chroma rather than fading through it. See blend().
const HERO_FIELD = 'ramp';

// Only the mesh field needs noise; the ramp is built without it.
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

const FIELD_BODIES = {
  ramp: `
        void main() {
          vec2 p = gl_FragCoord.xy / uRes - 0.5;

          // The angle drifts either side of 42 degrees while the ramp slides
          // along itself, so the gradient is never twice in the same place.
          // Dividing by |cos| + |sin| normalises the diagonal back to 0-1, which
          // is what keeps every stop on screen at any angle or aspect ratio.
          float a = 0.733 + sin(uTime * 0.045) * 0.22;
          float d = (p.x * cos(a) + p.y * sin(a)) / (abs(cos(a)) + abs(sin(a))) + 0.5;
          d += sin(uTime * 0.13) * 0.07;

          fragColor = vec4(present(palRamp(d)), 1.0);
        }
`,

  mesh: `
        void main() {
          vec2 uv = gl_FragCoord.xy / uRes;
          float aspect = uRes.x / uRes.y;
          vec2 p = vec2(uv.x * aspect, uv.y);

          vec3 acc = vec3(0.0);
          float wsum = 0.0;
          for (int i = 0; i < ${COLOR_SLOTS}; i++) {
            vec2 sp = uSources[i];
            float d2 = dot(p - sp, p - sp);
            float w = 1.0 / pow(d2 + 0.010, 1.30);
            acc += stop(i) * w;
            wsum += w;
          }
          vec3 col = acc / wsum;

          // Slow luminance turbulence, so the blend has some weather in it.
          // Only OKLab's L is scaled: scaling the whole triple would drag the
          // a/b axes towards zero and wash the hue out along with it.
          float n = fbm(p * 1.15 + vec2(uTime * 0.02, uTime * -0.015));
          col.x *= 0.93 + 0.14 * n;

          fragColor = vec4(present(col), 1.0);
        }
`,
};

function buildFragmentShader(octaves) {
  const isMesh = HERO_FIELD === 'mesh';

  return `
        uniform float uTime;
        uniform vec2  uRes;
        uniform float uMix;
        uniform vec3  uColorsA[${COLOR_SLOTS}];
        uniform vec3  uColorsB[${COLOR_SLOTS}];
${isMesh ? `        // Solved on the CPU once a frame -- see SOURCE_ORBITS.
        uniform vec2  uSources[${COLOR_SLOTS}];` : ''}

        // GLSL3 leaves the fragment output to the material, so declare it.
        layout(location = 0) out vec4 fragColor;

        // How far apart the slots turn over. Enough that the palette changes
        // stop by stop rather than all at once; not so much that the ramp is
        // carrying two unrelated palettes at either end.
        const float STAGGER = 0.30;

        const float PI  = 3.14159265359;
        const float TAU = 6.28318530718;
${isMesh ? NOISE_HELPERS(octaves) : ''}
        // Crossfading two saturated palettes takes every stop through a duller
        // middle to get where it is going: straight-line interpolation between
        // two hues passes near the neutral axis, so the hero visibly loses
        // chroma halfway through a change however soft the blend is. Read in
        // polar OKLab instead, a stop has a hue angle and a chroma, and it can
        // rotate around the wheel to its new hue -- the short way -- holding
        // its chroma the whole way. The colour turns rather than being
        // replaced, and it never passes through grey to do it.
        vec3 blend(vec3 a, vec3 b, float t) {
          float ha = atan(a.z, a.y), hb = atan(b.z, b.y);
          float ca = length(a.yz), cb = length(b.yz);

          // A near-neutral stop has no hue of its own to travel from -- atan on
          // a zero vector answers 0, the red axis -- so it would swing through
          // reds on its way to a chromatic partner. It borrows the other end's
          // hue instead, and simply gains or loses chroma where it stands.
          if (ca < 0.004) ha = hb;
          if (cb < 0.004) hb = ha;

          // Wrapped into -PI..PI, so a stop always takes the shorter arc rather
          // than unwinding the long way round the wheel.
          float dh = mod(hb - ha + PI, TAU) - PI;
          float h = ha + dh * t;
          float c = mix(ca, cb, t);

          return vec3(mix(a.x, b.x, t), c * cos(h), c * sin(h));
        }

        // Both palettes are resident; each slot rotates from one to the other,
        // trailing the slot before it a little so the palette turns over stop
        // by stop instead of in one piece.
        vec3 stop(int i) {
          float lead = float(i) / float(${COLOR_SLOTS} - 1) * STAGGER;
          float t = clamp(uMix * (1.0 + STAGGER) - lead, 0.0, 1.0);
          return blend(uColorsA[i], uColorsB[i], t);
        }

        // Walk the stops as a gradient, eased between each pair.
        vec3 palRamp(float t) {
          float x = clamp(t, 0.0, 1.0) * float(${COLOR_SLOTS} - 1);
          int i = int(floor(x));
          int j = min(i + 1, ${COLOR_SLOTS} - 1);
          return mix(stop(i), stop(j), smoothstep(0.0, 1.0, fract(x)));
        }

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
          return srgb + (dither(gl_FragCoord.xy) - 0.5) * 0.015;
        }
${FIELD_BODIES[HERO_FIELD]}      `;
}

// Animated gradient background. The field is chosen by HERO_FIELD above.
function AnimatedGradientBackground({ colors }) {
  const timeoutRef = useRef(null);
  const resRef = useRef(new THREE.Vector2());
  const timeRef = useRef(0);

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
      uMix: { value: 0 },
      ...(HERO_FIELD === 'mesh'
        ? { uSources: { value: new Float32Array(COLOR_SLOTS * 2) } }
        : {}),
      uColorsA: { value: slots.slice() },
      uColorsB: { value: slots.slice() },
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

  useEffect(() => {
    const scheduleNextChange = () => {
      const delay = (5 + Math.random() * 10) * 1000;
      timeoutRef.current = setTimeout(() => {
        // Fill whichever set is currently faded out, then dissolve towards it.
        const toB = material.uniforms.uMix.value < 0.5;
        const target = toB ? 'uColorsB' : 'uColorsA';
        material.uniforms[target].value.set(
          oklabSlots(new GradientGenerator(randomColorCount(), false, true).colors)
        );

        gsap.to(material.uniforms.uMix, {
          value: toB ? 1 : 0,
          duration: 7,
          ease: 'sine.inOut',
        });

        scheduleNextChange();
      }, delay);
    };

    scheduleNextChange();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      gsap.killTweensOf(material.uniforms.uMix);
      material.dispose();
    };
  }, [material]);

  useFrame((state, delta) => {
    // r3f resets clock.elapsedTime to 0 whenever frameloop changes, so the
    // field keeps its own clock -- otherwise every source would snap back to
    // its starting position each time the header scrolled into view. The clamp
    // absorbs the long first delta after a resume.
    timeRef.current += Math.min(delta, 1 / 30);
    const time = timeRef.current;
    material.uniforms.uTime.value = time;

    const res = state.gl.getDrawingBufferSize(resRef.current);
    material.uniforms.uRes.value.set(res.x, res.y);

    if (HERO_FIELD === 'mesh') {
      const aspect = res.x / res.y;
      const sources = material.uniforms.uSources.value;

      for (let i = 0; i < COLOR_SLOTS; i++) {
        const orbit = SOURCE_ORBITS[i];
        sources[i * 2] = (orbit.x + 0.19 * Math.sin(time * orbit.rateX + orbit.phaseX)) * aspect;
        sources[i * 2 + 1] = orbit.y + 0.19 * Math.cos(time * orbit.rateY + orbit.phaseY);
      }
    }
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

export default function HeaderScene({ colors, fallback, ready, onReady }) {
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
      // The transition itself lives in ThreeHeaderBackground.scss, alongside
      // the gradient's, so the two are timed from one place.
      style={{ background: fallback || fallbackColor, opacity: ready ? 1 : 0 }}
      onCreated={({ gl }) => gl.setClearColor(fallbackColor)}
    >
      <FirstFrameSignal onReady={onReady} />
      <Scene colors={colors} />
    </Canvas>
  );
}
