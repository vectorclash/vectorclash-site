import { useRef, useEffect, useState, Suspense } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import tinycolor from 'tinycolor2';
import ProjectShape from './ProjectShape';
import VideoShape from './VideoShape';

function Scene({ textureURL, videoURL, fogColor, onTextureLoad }) {
  const projectGroupRef = useRef();
  const videoGroupRef = useRef();
  const { camera, gl } = useThree();

  useEffect(() => {
    const handleScroll = () => {
      const parentElement = gl.domElement.parentNode;
      if (!parentElement) return;

      gsap.to(camera.position, {
        duration: 0.5,
        y: parentElement.getBoundingClientRect().y * 0.13,
        ease: 'quad.out',
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
        {textureURL && (
          <Suspense fallback={null}>
            <ProjectShape size={300} textureURL={textureURL} onLoadComplete={onTextureLoad} />
          </Suspense>
        )}
      </group>

      <group ref={videoGroupRef}>
        {videoURL && <VideoShape url={videoURL} size={50} />}
      </group>
    </>
  );
}

export default function ProjectsScene({ textureURL, videoURL, onTextureLoad }) {
  const [fogColor, setFogColor] = useState('#fb0097');
  const [backgroundColor, setBackgroundColor] = useState('#fb0097');

  useEffect(() => {
    if (textureURL) {
      const newColor = tinycolor('#CCFF00').spin(Math.random() * 360);
      setFogColor(newColor.toHexString());
      setBackgroundColor(newColor.toHexString());
    }
  }, [textureURL]);

  return (
    <Canvas
      camera={{ position: [0, 2, 160], fov: 50, near: 0.1, far: 20000 }}
      gl={{
        antialias: true,
        precision: 'highp',
      }}
      style={{ background: backgroundColor }}
    >
      <Scene
        textureURL={textureURL}
        videoURL={videoURL}
        fogColor={fogColor}
        onTextureLoad={onTextureLoad}
      />
    </Canvas>
  );
}
