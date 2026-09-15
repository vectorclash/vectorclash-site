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
import {
  getParticleConfig,
  shouldEnableBloom,
  shouldEnableAntialias,
  detectPerformanceTier,
} from '../../utils/PerformanceDetector';
import useRenderWhenVisible from '../../utils/useRenderWhenVisible';

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

function paletteSlots(colors) {
  const stops = colors.map((c) => new THREE.Color(c.toHexString()));
  const out = new Float32Array(COLOR_SLOTS * 3);

  for (let i = 0; i < COLOR_SLOTS; i++) {
    const x = (i / (COLOR_SLOTS - 1)) * (stops.length - 1);
    const lo = stops[Math.floor(x)];
    const hi = stops[Math.min(Math.ceil(x), stops.length - 1)];
    const f = x - Math.floor(x);
    out[i * 3] = lo.r + (hi.r - lo.r) * f;
    out[i * 3 + 1] = lo.g + (hi.g - lo.g) * f;
    out[i * 3 + 2] = lo.b + (hi.b - lo.b) * f;
  }

  return out;
}

// The mesh field has no single middle stop the way a linear ramp did, so the
// fog, the fill light and the CSS fallback take a luminance-weighted average
// of the palette instead of whichever colour happened to sit in the middle.
function paletteAverage(colors) {
  const acc = new THREE.Color(0, 0, 0);
  let total = 0;

  colors.forEach((c) => {
    const col = new THREE.Color(c.toHexString());
    const weight = 0.2126 * col.r + 0.7152 * col.g + 0.0722 * col.b + 0.05;
    acc.r += col.r * weight;
    acc.g += col.g * weight;
    acc.b += col.b * weight;
    total += weight;
  });

  acc.r /= total;
  acc.g /= total;
  acc.b /= total;
  return `#${acc.getHexString()}`;
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
// Either way two palettes stay resident and uMix crossfades between them on the
// same 5-15s / 5s-dissolve cadence.
const HERO_FIELD = 'ramp';

// Only the mesh field needs noise, so the ramp shader is built without it.
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

          vec3 col = palRamp(d);

          // A grain of dither, which keeps the wide soft blend off banding.
          col += (dither(gl_FragCoord.xy) - 0.5) * 0.02;

          fragColor = vec4(col, 1.0);
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
          float n = fbm(p * 1.15 + vec2(uTime * 0.02, uTime * -0.015));
          col *= 0.93 + 0.14 * n;

          col += (dither(gl_FragCoord.xy) - 0.5) * 0.02;

          fragColor = vec4(col, 1.0);
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

        // Both palettes are resident; uMix dissolves between them slot for slot.
        vec3 stop(int i) {
          return mix(uColorsA[i], uColorsB[i], uMix);
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
${isMesh ? NOISE_HELPERS(octaves) : ''}${FIELD_BODIES[HERO_FIELD]}      `;
}

// Animated gradient background. The field is chosen by HERO_FIELD above.
function AnimatedGradientBackground({ colors }) {
  const timeoutRef = useRef(null);
  const resRef = useRef(new THREE.Vector2());
  const timeRef = useRef(0);

  const material = useMemo(() => {
    // GLSL3 so the colour arrays can be indexed by a loop variable through a
    // function parameter, which ES 1.00 forbids.
    const octaves = detectPerformanceTier() === 'low' ? 2 : 4;

    // Seeded here rather than in an effect. Zeroed colour uniforms render pure
    // black, and any frame that lands between the first render and the effect
    // commit would show it -- which is the black flash on a cold load.
    const slots = paletteSlots(colors);

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
          paletteSlots(new GradientGenerator(randomColorCount(), false, true).colors)
        );

        gsap.to(material.uniforms.uMix, {
          value: toB ? 1 : 0,
          duration: 5,
          ease: 'power2.inOut',
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

  // Get performance-based configuration
  const particleConfig = getParticleConfig();
  const enableBloom = shouldEnableBloom();

  // Roll each field's star size once. Randomizing inline in the JSX would hand
  // every field a new size on any re-render, visibly resizing stars mid-scroll.
  const smallFields = useMemo(
    () =>
      Array.from({ length: particleConfig.smallFields }, () => ({
        size: 0.8 + Math.random() * 1.5,
      })),
    [particleConfig.smallFields]
  );

  const largeFields = useMemo(
    () =>
      Array.from({ length: particleConfig.largeFields }, () => ({
        size: 15 + Math.random() * 35,
      })),
    [particleConfig.largeFields]
  );

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
      <directionalLight intensity={0.2} color={fogColor} />

      <group ref={groupRef} scale={[0.00002, 0.00002, 0.00002]} visible={false}>
        <WireframeBox size={2000} depth={12} color={fogColor} />
        <ShapeSwarm amount={5} containerSize={SWARM_LARGE} />
        <ShapeSwarm amount={5} containerSize={SWARM_SMALL} />
        <Suspense fallback={null}>
          <BrightCluster />
        </Suspense>

        {/* Small particles - optimized for visibility in front of camera */}
        {starSmallImage &&
          smallFields.map((field, i) => (
            <ParticleField
              key={`small-${i}`}
              particleNum={particleConfig.smallParticles}
              image={starSmallImage}
              size={field.size}
              opacity={0.6}
              containerSize={SMALL_STAR_FIELD}
            />
          ))}

        {/* Large particles - optimized for visibility */}
        {starLargeImage &&
          largeFields.map((field, i) => (
            <ParticleField
              key={`large-${i}`}
              particleNum={particleConfig.largeParticles}
              image={starLargeImage}
              size={field.size}
              opacity={0.8}
              containerSize={LARGE_STAR_FIELD}
            />
          ))}
      </group>

      {enableBloom && (
        <EffectComposer>
          <Bloom
            intensity={1}
            luminanceThreshold={0.3}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      )}
    </>
  );
}

export default function HeaderScene({ colors, fallback, ready, onReady }) {
  const fallbackColor = paletteAverage(colors);
  const enableAntialias = shouldEnableAntialias();
  const [canvasRef, frameloop] = useRenderWhenVisible();

  return (
    <Canvas
      ref={canvasRef}
      frameloop={frameloop}
      // Uncapped, this follows devicePixelRatio -- 2 on a retina laptop, which
      // is four times the fragment work for a soft gradient that cannot show
      // the difference.
      dpr={[1, 1.5]}
      camera={{ position: [0, 2, 130], fov: 60, near: 0.1, far: 20000 }}
      gl={{
        antialias: enableAntialias,
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
