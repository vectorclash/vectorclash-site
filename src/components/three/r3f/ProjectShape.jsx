import { useRef, useEffect, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import tinycolor from 'tinycolor2';

// Module-level variable to persist across component remounts
let hasEverAnimated = false;

// Loads the images of the open project only. Every image of every project used
// to be fetched at page load so that this one lookup could never miss -- 43
// full-size JPEGs downloaded and decoded to texture a single cube face. Scoped
// to one project it is at most eight, and they are the eight the gallery
// thumbnails can actually switch to, so switching within a project is still
// instant and never re-suspends.
export default function ProjectShape({ size = 300, textureURL, imageURLs }) {
  const groupRef = useRef();
  const meshRef = useRef();
  const previousTextureURL = useRef(null);

  const loaded = useTexture(imageURLs, (result) => {
    // The shape is viewed from the inside (BackSide), so the map is flipped
    // horizontally to read the right way round.
    const textures = Array.isArray(result) ? result : [result];
    textures.forEach((t) => {
      t.wrapS = THREE.RepeatWrapping;
      t.repeat.x = -1;
    });
  });

  const texture = useMemo(() => {
    const textures = Array.isArray(loaded) ? loaded : [loaded];
    const index = imageURLs.indexOf(textureURL);
    return index === -1 ? null : textures[index];
  }, [textureURL, loaded, imageURLs]);

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
        <boxGeometry args={[size, size, size, 4, 4, 4]} />
        <meshBasicMaterial
          map={texture}
          color={0x777777}
          side={THREE.BackSide}
          transparent
          opacity={1}
        />
      </mesh>

      {/* Wireframe mesh 1 */}
      <mesh scale={[0.9, 0.9, 0.9]}>
        <boxGeometry args={[size, size, size, 4, 4, 4]} />
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
