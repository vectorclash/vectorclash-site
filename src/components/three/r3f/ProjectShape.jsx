import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import tinycolor from 'tinycolor2';

export default function ProjectShape({ size = 300, textureURL, onLoadComplete }) {
  const groupRef = useRef();
  const meshRef = useRef();

  const texture = useTexture(textureURL, (loadedTexture) => {
    loadedTexture.wrapS = THREE.RepeatWrapping;
    loadedTexture.repeat.x = -1;
    if (onLoadComplete) onLoadComplete();
  });

  const wireframeColors = useMemo(() => ({
    color1: tinycolor('#CCFF00').spin(Math.random() * 360).toHexString(),
    color2: tinycolor('#CCFF00').spin(Math.random() * 360).toHexString(),
  }), []);

  useEffect(() => {
    if (!groupRef.current || !meshRef.current) return;

    // Initial scale animation
    gsap.from(groupRef.current.scale, {
      duration: 0.5,
      x: 0.8,
      y: 0.8,
      z: 0.8,
      ease: 'quad.inOut',
    });

    // Initial opacity animation
    gsap.from(meshRef.current.material, {
      duration: 0.5,
      opacity: 0,
      ease: 'quad.inOut',
    });
  }, []);

  return (
    <group ref={groupRef}>
      {/* Main textured mesh */}
      <mesh ref={meshRef}>
        <boxGeometry args={[size, size, size, 6, 6, 6]} />
        <meshStandardMaterial
          map={texture}
          color={0x777777}
          roughness={0.5}
          side={THREE.BackSide}
          transparent
          opacity={1}
        />
      </mesh>

      {/* Wireframe mesh 1 */}
      <mesh scale={[0.9, 0.9, 0.9]}>
        <boxGeometry args={[size, size, size, 6, 6, 6]} />
        <meshBasicMaterial
          color={wireframeColors.color1}
          wireframe
          transparent
          opacity={0.1}
        />
      </mesh>

      {/* Wireframe mesh 2 */}
      <mesh scale={[0.95, 0.95, 0.95]}>
        <boxGeometry args={[size, size, size, 2, 2, 2]} />
        <meshBasicMaterial
          color={wireframeColors.color2}
          wireframe
          transparent
          opacity={0.4}
        />
      </mesh>
    </group>
  );
}
