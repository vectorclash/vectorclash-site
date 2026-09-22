import { useRef, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import gsap from 'gsap';
import tinycolor from 'tinycolor2';
import ProjectShape from './ProjectShape';
import VideoShape from './VideoShape';
import { latchedSettings } from '../../utils/qualityLevel';
import useQuality from '../../utils/useQuality';
import useRenderWhenVisible from '../../utils/useRenderWhenVisible';
import QualityGovernor from './QualityGovernor';

// Grain is the one thing in this scene the quality level can take away, so it
// goes the same way the star fields do: it fades rather than vanishing. The
// opacity prop is pulled out of the effect's constructor arguments by the
// library and applied as a live uniform, so tweening it here neither rebuilds
// the pass nor recompiles anything.
const GRAIN_FADE = 0.8;

// The framing is authored here rather than inherited from the canvas.
//
// ProjectShape is a 300 unit box turned inside out, and the camera sits just
// outside its near face, so the far wall is 310 units away -- which is why a 50
// degree vertical fov used to put the whole of that wall inside the frame. It
// read as an enveloping form anyway only because the canvas was as tall as the
// section and the viewport ever showed a crop of it. Once the canvas is one
// viewport tall the frame has to do that cropping itself, or the whole scene
// arrives at roughly half the size it used to.
const CAMERA_Z = 160;
const FAR_WALL = CAMERA_Z + 150;

// How much of the far wall stays in view: a little over half the box, which is
// about what a screen used to show of it.
const FRAME_HEIGHT = 165;

// A quarter turn over the length of the section. The backdrop is a box, so 90
// degrees is its whole symmetry -- the study ends on a composition equivalent
// to the one it opened with rather than part way through a face.
const SCROLL_ROTATION = Math.PI / 2;

const DEG = 180 / Math.PI;

/**
 * Holds FRAME_HEIGHT of the far wall in view at any viewport, and hands back
 * the metrics that let the rest of the scene place things against the frame's
 * edges rather than at world positions that only suit one shape of screen.
 */
function useFramedCamera() {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const aspect = size.width / size.height;

  const tanHalfV = useMemo(() => {
    const vertical = Math.tan(Math.atan(FRAME_HEIGHT / 2 / FAR_WALL));
    // A portrait viewport keeping the full height would show barely a hundred
    // units across, which is a different composition rather than the same one
    // on a narrower screen. Below square the frame is fitted to its width.
    return aspect >= 1 ? vertical : vertical / aspect;
  }, [aspect]);

  useLayoutEffect(() => {
    camera.fov = 2 * Math.atan(tanHalfV) * DEG;
    camera.updateProjectionMatrix();
  }, [camera, tanHalfV]);

  return { tanHalfV, aspect };
}

function FilmGrain({ opacity }) {
  const ref = useRef();

  useEffect(() => {
    const blend = ref.current?.blendMode;
    if (!blend) return undefined;

    const tween = gsap.to(blend.opacity, {
      value: opacity,
      duration: GRAIN_FADE,
      ease: 'quad.inOut',
    });

    return () => tween.kill();
  }, [opacity]);

  // Mounted at zero and tweened up, so the grain arrives rather than appearing.
  return <Noise ref={ref} blendFunction={BlendFunction.SCREEN} opacity={0} />;
}

/**
 * True while `on` is true, and for `ms` afterwards.
 *
 * The composer itself has to outlive the fade. Unmounting it the moment the
 * grain is switched off would cut the fade short and take a whole render pass
 * out from under the scene in the same frame, which is a visible flash --
 * the composer draws through its own target, so losing it changes how the
 * frame is composited, not just what is in it.
 */
function useLingering(on, ms) {
  const [lingering, setLingering] = useState(on);

  useEffect(() => {
    if (on) {
      setLingering(true);
      return undefined;
    }

    const timer = setTimeout(() => setLingering(false), ms);
    return () => clearTimeout(timer);
  }, [on, ms]);

  return on || lingering;
}

// Where the video sits along the camera's axis. It is nearer than the box's far
// wall, so the frame is smaller where it stands and it has to be placed against
// that frame rather than against the wall's.
const VIDEO_DEPTH = -20;

function Scene({ textureURL, videoURLs, fogColor, imageURLs }) {
  const projectGroupRef = useRef();
  const videoGroupRef = useRef();
  const scrollGroupRef = useRef();
  // Narrow selectors so a canvas resize doesn't re-render the whole scene.
  const gl = useThree((state) => state.gl);
  const frame = useFramedCamera();

  // Hung off the lower left corner of the frame rather than parked at a fixed
  // y. At the old fov that fixed y happened to fall just inside the bottom
  // edge; at any tighter framing it falls straight out of shot.
  const videoPosition = useMemo(() => {
    const halfHeight = (CAMERA_Z - VIDEO_DEPTH) * frame.tanHalfV;
    const halfWidth = halfHeight * frame.aspect;
    return [-halfWidth * 0.5, -halfHeight * 0.5, VIDEO_DEPTH];
  }, [frame.tanHalfV, frame.aspect]);

  const { settings } = useQuality();
  const grainOn = settings.grain > 0;
  const composerMounted = useLingering(grainOn, GRAIN_FADE * 1000 + 100);

  useEffect(() => {
    let rotationTween = null;

    const handleScroll = () => {
      // The container is the box the sticky canvas is free to travel through,
      // so its bounds are also the range the scroll link is measured against.
      const range = gl.domElement.closest('.project-three-container');
      if (!range || !scrollGroupRef.current) return;

      const rect = range.getBoundingClientRect();
      // What the sticky canvas actually has to travel: everything past the one
      // viewport it occupies. Floored at a pixel so a section shorter than the
      // screen cannot divide by zero.
      const travel = Math.max(1, rect.height - window.innerHeight);
      const progress = Math.min(1, Math.max(0, -rect.top / travel));

      if (rotationTween) rotationTween.kill();

      // Turning the backdrop rather than sliding the camera down past it. The
      // camera drift this replaces moved the framing off the shape instead of
      // moving through anything, and a case study is long enough that it spent
      // most of the read parked at the bottom of its range.
      //
      // Measured as progress through the section rather than against a raw
      // scroll distance the way the hero is, because a study can be three
      // screens or six: the quarter turn has to spread over whichever it is.
      rotationTween = gsap.to(scrollGroupRef.current.rotation, {
        duration: 0.5,
        y: progress * SCROLL_ROTATION,
        ease: 'quad.out',
      });
    };

    // The section grows by several screens when a case study opens, so the
    // range is re-read on every scroll rather than measured once here. This
    // first call is only to set the scene against wherever the page already is.
    handleScroll();

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rotationTween) rotationTween.kill();
    };
  }, [gl]);

  useFrame(() => {
    if (projectGroupRef.current) {
      projectGroupRef.current.rotation.x += 0.001;
      projectGroupRef.current.rotation.y += 0.0008;
      projectGroupRef.current.rotation.z -= 0.0009;
    }

    if (videoGroupRef.current) {
      videoGroupRef.current.rotation.x -= 0.001;
      videoGroupRef.current.rotation.y -= 0.0008;
      videoGroupRef.current.rotation.z += 0.0009;
    }
  });

  return (
    <>
      <fog attach="fog" args={[fogColor, 1, 1400]} />
      <ambientLight intensity={1.5} color={0xfafafa} />
      <directionalLight intensity={1} color={0x00ccff} />

      {/*
        No Suspense boundary here on purpose. ProjectShape loads its textures
        itself precisely so that it does not suspend: a boundary would take the
        shape off screen for the length of a project's first load and put it
        back afterwards, which is the two-part transition this scene used to
        have.
      */}
      {/*
        Two groups, because the idle tumble in useFrame adds to its rotation
        every frame while the scroll link sets one absolutely. On a single group
        they would overwrite each other frame by frame; nested, they compose.
      */}
      <group ref={scrollGroupRef}>
        <group ref={projectGroupRef}>
          {textureURL && imageURLs.length > 0 && (
            <ProjectShape key="project-shape" size={300} textureURL={textureURL} imageURLs={imageURLs} />
          )}
        </group>
      </group>

      <group ref={videoGroupRef} position={videoPosition}>
        {videoURLs && videoURLs.length > 0 && <VideoShape urls={videoURLs} size={50} />}
      </group>

      <QualityGovernor />

      {composerMounted && (
        <EffectComposer multisampling={latchedSettings().multisampling}>
          <FilmGrain opacity={grainOn ? settings.grain : 0} />
        </EffectComposer>
      )}
    </>
  );
}

export default function ProjectsScene({ textureURL, videoURLs, imageURLs = [] }) {
  // This canvas is mounted for the life of the page and merely faded to zero
  // opacity when no project is open, so on-screen alone is not enough to decide
  // whether it is worth drawing. A null textureURL is the existing signal that
  // nothing is being shown.
  const [canvasRef, frameloop] = useRenderWhenVisible(Boolean(textureURL || videoURLs));
  const [fogColor, setFogColor] = useState('#fb0097');
  const [backgroundColor, setBackgroundColor] = useState('#fb0097');

  useEffect(() => {
    if (textureURL) {
      const newColor = tinycolor('#CCFF00').spin(Math.random() * 360);
      setFogColor(newColor.toHexString());
      setBackgroundColor(newColor.toHexString());
    } else {
      setBackgroundColor('transparent');
    }
  }, [textureURL]);

  return (
    <Canvas
      ref={canvasRef}
      frameloop={frameloop}
      // Starting value only; QualityGovernor drives it from here.
      dpr={Math.min(latchedSettings().dpr, window.devicePixelRatio || 1)}
      // fov is a starting value only, so the first frame is not drawn at
      // three's default before useFramedCamera has derived the real one.
      camera={{ position: [0, 2, CAMERA_Z], fov: 30, near: 0.1, far: 20000 }}
      gl={{
        // Only consulted at the bottom level, where the composer is unmounted
        // and the scene draws straight to the backbuffer. Everywhere else the
        // composer's own multisampling is what counts.
        antialias: latchedSettings().multisampling > 0,
        // No precision override. It used to drop to mediump below the top tier,
        // which is a blunt instrument -- it lowers the default precision for
        // every fragment shader in the scene at once, and this hero already has
        // a documented precision-sensitive dither in it. The saving was never
        // measured and the failure mode is banding, so three's highp default
        // stands.
        alpha: false, // Disable alpha for better performance
        physicallyCorrectLights: false, // Disable for better performance
        powerPreference: 'high-performance', // Request high-performance GPU
      }}
      // Sticky rather than filling its container, which is the whole section.
      // A case study is several screens, and a backdrop anchored to the top of
      // one would be gone by the second plate -- so the scene travels with the
      // read instead, pinned to the viewport until the section runs out from
      // under it. It also bounds the drawing buffer: r3f sizes the renderer
      // from this box, so a section thousands of pixels tall no longer means a
      // canvas thousands of pixels tall.
      style={{
        background: backgroundColor,
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}
    >
      <Scene
        textureURL={textureURL}
        videoURLs={videoURLs}
        fogColor={fogColor}
        imageURLs={imageURLs}
      />
    </Canvas>
  );
}
