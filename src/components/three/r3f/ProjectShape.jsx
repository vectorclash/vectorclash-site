import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import tinycolor from 'tinycolor2';

// Module-level variable to persist across component remounts
let hasEverAnimated = false;

export default function ProjectShape({ size = 300, textureURL, preloadedTextures, allImageURLs }) {
  const groupRef = useRef();
  const meshRef = useRef();
  const previousTextureURL = useRef(null);

  // Find the matching texture from preloaded textures
  const texture = useMemo(() => {
    if (!preloadedTextures || !allImageURLs || !textureURL) return null;

    const textureIndex = allImageURLs.indexOf(textureURL);
    if (textureIndex === -1) return null;

    return Array.isArray(preloadedTextures) ? preloadedTextures[textureIndex] : preloadedTextures;
  }, [textureURL, preloadedTextures, allImageURLs]);

  const wireframeColors = useMemo(() => ({
    color1: tinycolor('#CCFF00').spin(Math.random() * 360).toHexString(),
    color2: tinycolor('#CCFF00').spin(Math.random() * 360).toHexString(),
  }), []);

  useEffect(() => {
    if (!groupRef.current || !meshRef.current) return;

    // Check if texture actually changed
    const textureChanged = previousTextureURL.current !== null && previousTextureURL.current !== textureURL;

    if (!hasEverAnimated) {
      // Very first load - simple fade in from initial material opacity
      gsap.from(groupRef.current.scale, {
        duration: 0.5,
        x: 0.8,
        y: 0.8,
        z: 0.8,
        ease: 'quad.inOut',
      });

      gsap.fromTo(meshRef.current.material,
        { opacity: 0 },
        {
          duration: 0.5,
          opacity: 1,
          ease: 'quad.inOut',
        }
      );

      hasEverAnimated = true;
      previousTextureURL.current = textureURL;
    } else if (textureChanged) {
      // Texture changed - crossfade
      gsap.to(meshRef.current.material, {
        duration: 0.2,
        opacity: 0,
        ease: 'quad.out',
        onComplete: () => {
          if (meshRef.current) {
            gsap.to(meshRef.current.material, {
              duration: 0.3,
              opacity: 1,
              ease: 'quad.in',
            });
          }
        },
      });

      // Subtle scale animation
      gsap.fromTo(
        groupRef.current.scale,
        { x: 0.98, y: 0.98, z: 0.98 },
        {
          duration: 0.5,
          x: 1,
          y: 1,
          z: 1,
          ease: 'back.out(1.2)',
        }
      );

      previousTextureURL.current = textureURL;
    }
  }, [textureURL]);

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
