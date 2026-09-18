import { useRef, useEffect, useState } from 'react';
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

function Scene({ textureURL, videoURLs, fogColor, imageURLs }) {
  const projectGroupRef = useRef();
  const videoGroupRef = useRef();
  // Narrow selectors so a canvas resize doesn't re-render the whole scene.
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);

  const { settings } = useQuality();
  const grainOn = settings.grain > 0;
  const composerMounted = useLingering(grainOn, GRAIN_FADE * 1000 + 100);

  useEffect(() => {
    const scrollTarget = { offsetY: 0 };
    let cameraTween = null;

    const handleScroll = () => {
      const parentElement = gl.domElement.parentNode;
      if (!parentElement) return;

      scrollTarget.offsetY = window.scrollY - parentElement.getBoundingClientRect().y;

      // Kill existing tween to prevent buildup
      if (cameraTween) cameraTween.kill();

      // Limit the camera movement to prevent going beyond the background cube
      // Use a very small multiplier so movement is spread across the entire section
      const maxMovement = 150; // Maximum camera movement in units (downward)
      const movement = -scrollTarget.offsetY * 0.025; // Much smaller multiplier for slower movement
      const targetY = Math.max(-maxMovement, Math.min(0, movement)); // Clamp between -maxMovement and 0

      cameraTween = gsap.to(camera.position, {
        duration: 0.5,
        y: targetY,
        ease: 'quad.out',
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (cameraTween) cameraTween.kill();
    };
  }, [camera, gl]);

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
      <group ref={projectGroupRef}>
        {textureURL && imageURLs.length > 0 && (
          <ProjectShape key="project-shape" size={300} textureURL={textureURL} imageURLs={imageURLs} />
        )}
      </group>

      <group ref={videoGroupRef} position={[-20, -70, -20]}>
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
      camera={{ position: [0, 2, 160], fov: 50, near: 0.1, far: 20000 }}
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
      style={{ background: backgroundColor }}
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
