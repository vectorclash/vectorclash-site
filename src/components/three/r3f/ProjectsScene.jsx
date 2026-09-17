import { useRef, useEffect, useState, Suspense } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import gsap from 'gsap';
import tinycolor from 'tinycolor2';
import ProjectShape from './ProjectShape';
import VideoShape from './VideoShape';
import { shouldEnableAntialias, getGLPrecision, detectPerformanceTier } from '../../utils/PerformanceDetector';
import useRenderWhenVisible from '../../utils/useRenderWhenVisible';

function Scene({ textureURL, videoURLs, fogColor, imageURLs }) {
  const projectGroupRef = useRef();
  const videoGroupRef = useRef();
  // Narrow selectors so a canvas resize doesn't re-render the whole scene.
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);

  // Get performance tier for conditional effects
  const performanceTier = detectPerformanceTier();
  const enablePostprocessing = performanceTier === 'high' || performanceTier === 'medium';

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

      <group ref={projectGroupRef}>
        <Suspense fallback={null}>
          {textureURL && imageURLs.length > 0 && (
            <ProjectShape key="project-shape" size={300} textureURL={textureURL} imageURLs={imageURLs} />
          )}
        </Suspense>
      </group>

      <group ref={videoGroupRef} position={[-20, -70, -20]}>
        {videoURLs && videoURLs.length > 0 && <VideoShape urls={videoURLs} size={50} />}
      </group>

      {enablePostprocessing && (
        <EffectComposer>
          {/* Film Grain/Noise */}
          <Noise
            blendFunction={BlendFunction.SCREEN} // Screen blend mode for better visibility
            opacity={0.05} // Visible grain effect
          />
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
  const enableAntialias = shouldEnableAntialias();
  const glPrecision = getGLPrecision();

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
      dpr={[1, 1.5]}
      camera={{ position: [0, 2, 160], fov: 50, near: 0.1, far: 20000 }}
      gl={{
        antialias: enableAntialias,
        precision: glPrecision,
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
