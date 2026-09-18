import { useRef, useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import tinycolor from 'tinycolor2';

// One loader and one cache of textures by URL for the whole page.
//
// This used to be drei's useTexture, which is a Suspense hook, and that is what
// made a project's first viewing transition twice: r3f's useLoader keys its
// cache on the entire URL list rather than on each URL, so every change to the
// list suspends until all of that project's images have loaded, and the
// boundary around this component drops to its null fallback for the whole of
// it. The shape vanished and then reappeared -- once the canvas had already
// faded up around it. On a second viewing the list is a cache hit, nothing
// suspends, and the shape simply cross-fades, which is why it only ever
// happened once per project.
//
// Loading the textures here instead takes the shape out of Suspense entirely.
// It stays mounted while a texture is on its way, keeps drawing the one it
// already has, and swaps at the bottom of a cross-fade it controls.
const loader = new THREE.TextureLoader();
const textureCache = new Map();

function loadTexture(url) {
  const cached = textureCache.get(url);
  if (cached) return cached;

  const pending = loader.loadAsync(url).then(
    (texture) => {
      // The shape is viewed from the inside (BackSide), so the map is flipped
      // horizontally to read the right way round.
      texture.wrapS = THREE.RepeatWrapping;
      texture.repeat.x = -1;
      return texture;
    },
    (error) => {
      // A failure is not cached: the next project to ask for this image gets a
      // fresh attempt rather than the old rejection.
      textureCache.delete(url);
      throw error;
    }
  );

  textureCache.set(url, pending);
  return pending;
}

// Loads the images of the open project only. Every image of every project used
// to be fetched at page load -- 43 full-size JPEGs downloaded and decoded to
// texture a single cube face. Scoped to one project it is at most eight, and
// they are the eight the gallery thumbnails can actually switch to, so
// switching within a project is still instant.
export default function ProjectShape({ size = 300, textureURL, imageURLs }) {
  const groupRef = useRef();
  const meshRef = useRef();
  // The texture currently on the material, so an arrival knows whether it is
  // the shape's entrance or a swap within it.
  const shownRef = useRef(null);

  const gl = useThree((state) => state.gl);

  const wireframeColors = useMemo(() => ({
    color1: tinycolor('#CCFF00').spin(Math.random() * 360).toHexString(),
    color2: tinycolor('#CCFF00').spin(Math.random() * 360).toHexString(),
  }), []);

  useEffect(() => {
    if (!textureURL) return undefined;

    let cancelled = false;

    loadTexture(textureURL)
      .then((texture) => {
        const mesh = meshRef.current;
        const group = groupRef.current;
        if (cancelled || !mesh || !group) return;

        // Uploaded to the GPU here rather than on the first frame that draws
        // it, which is mid-animation and the worst moment to stall.
        if ('initTexture' in gl) gl.initTexture(texture);

        const material = mesh.material;
        const apply = () => {
          material.map = texture;
          material.needsUpdate = true;
          shownRef.current = texture;
        };

        gsap.killTweensOf(material);
        gsap.killTweensOf(group.scale);

        if (!shownRef.current) {
          // Nothing on the material yet, so this is the shape arriving: it
          // mounts empty and at zero opacity, and a project being opened
          // should not find it already drawn.
          apply();
          gsap.fromTo(
            group.scale,
            { x: 0.8, y: 0.8, z: 0.8 },
            { duration: 0.5, x: 1, y: 1, z: 1, ease: 'quad.inOut' }
          );
          gsap.fromTo(
            material,
            { opacity: 0 },
            { duration: 0.5, opacity: 1, ease: 'quad.inOut' }
          );
          return;
        }

        // A swap: fade the old image out, change the map where nothing can be
        // seen of either, and bring the new one back up.
        gsap.to(material, {
          duration: 0.2,
          opacity: 0,
          ease: 'quad.out',
          onComplete: () => {
            if (!meshRef.current) return;
            apply();
            gsap.to(material, { duration: 0.3, opacity: 1, ease: 'quad.in' });
          },
        });

        gsap.fromTo(
          group.scale,
          { x: 0.98, y: 0.98, z: 0.98 },
          { duration: 0.5, x: 1, y: 1, z: 1, ease: 'back.out(1.2)' }
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [textureURL, gl]);

  // The rest of the project follows once the image being drawn is in hand, so
  // that switching gallery thumbnails does not wait on a download. Nothing
  // visible is on the far side of this: it warms the cache and that is all.
  useEffect(() => {
    if (!imageURLs || imageURLs.length === 0) return undefined;

    let cancelled = false;

    loadTexture(textureURL)
      .then(() => {
        if (cancelled) return;
        imageURLs.forEach((url) => loadTexture(url).catch(() => {}));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [imageURLs, textureURL]);

  return (
    <group ref={groupRef}>
      {/* Main textured mesh. The map is set imperatively as textures arrive. */}
      <mesh ref={meshRef}>
        <boxGeometry args={[size, size, size, 4, 4, 4]} />
        <meshBasicMaterial
          color={0x777777}
          side={THREE.BackSide}
          transparent
          opacity={0}
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
