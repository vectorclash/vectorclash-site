import { useRef, useEffect, useState, Suspense } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { EffectComposer, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import gsap from 'gsap';
import tinycolor from 'tinycolor2';
import ProjectShape from './ProjectShape';
import VideoShape from './VideoShape';
import { shouldEnableAntialias, getGLPrecision, shouldEnableBloom, detectPerformanceTier } from '../../utils/PerformanceDetector';

function Scene({ textureURL, videoURL, fogColor, allImageURLs, onLoadComplete }) {
  const projectGroupRef = useRef();
  const videoGroupRef = useRef();
  const { camera, gl } = useThree();
  const [loadComplete, setLoadComplete] = useState(false);

  // Get performance tier for conditional effects
  const performanceTier = detectPerformanceTier();
  const enablePostprocessing = performanceTier === 'high' || performanceTier === 'medium';

  // Preload all textures
  const preloadedTextures = useTexture(allImageURLs, (loadedTextures) => {
    // Configure all textures
    const texturesArray = Array.isArray(loadedTextures) ? loadedTextures : [loadedTextures];
    texturesArray.forEach(texture => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.repeat.x = -1;
    });

    // Mark as loaded after a short delay
    if (!loadComplete) {
      setTimeout(() => {
        setLoadComplete(true);
        if (onLoadComplete) {
          onLoadComplete();
        }
      }, 100);
    }
  });

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
          {textureURL && <ProjectShape key="project-shape" size={300} textureURL={textureURL} preloadedTextures={preloadedTextures} allImageURLs={allImageURLs} />}
        </Suspense>
      </group>

      <group ref={videoGroupRef} position={[-20, -70, -20]}>
        {videoURL && <VideoShape url={videoURL} size={50} />}
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

export default function ProjectsScene({ textureURL, videoURL, allImageURLs = [], onLoadComplete }) {
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
        videoURL={videoURL}
        fogColor={fogColor}
        allImageURLs={allImageURLs}
        onLoadComplete={onLoadComplete}
      />
    </Canvas>
  );
}
