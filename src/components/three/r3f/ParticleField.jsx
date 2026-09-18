import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import CanvasRadialGradient from '../CanvasRadialGradient';

// The gradient-masked sprite is built from CanvasRadialGradient, which rolls a
// fresh hue every time it is constructed -- so the hero's ~37 fields each
// arrived in their own tint. Building one per field meant 37 canvas composites
// and 37 uploads at startup; caching one per image cut that to two, and painted
// every star in the hero one of two colours.
//
// A small pool per image keeps both: the number of composites stays bounded,
// and fields draw from the pool at random, so the hero still comes up in a
// spread of tints rather than a pair of them.
const SPRITE_VARIANTS = 10;

const spritePools = new WeakMap();

function buildSprite(image) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');

  context.globalCompositeOperation = 'destination-atop';
  const gradient = new CanvasRadialGradient(image.width, image.height);
  context.drawImage(gradient, 0, 0);
  context.drawImage(image, 0, 0);

  const tex = new THREE.Texture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function spriteTexture(image) {
  if (!image) return null;

  let pool = spritePools.get(image);
  if (!pool) {
    pool = new Array(SPRITE_VARIANTS).fill(null);
    spritePools.set(image, pool);
  }

  // Filled lazily, so a hero that only ever mounts a handful of fields only
  // ever composites a handful of sprites.
  const variant = Math.floor(Math.random() * SPRITE_VARIANTS);
  if (!pool[variant]) pool[variant] = buildSprite(image);

  return pool[variant];
}

// How long a field takes to leave, and to come back if the governor changes its
// mind. Leaving is the quicker of the two: a field on its way out is being
// removed because the device is struggling, and drawing it for another second
// and a half to be polite about it defeats the point.
const RETIRE_DURATION = 0.9;
const REVIVE_DURATION = 1.4;

export default function ParticleField({
  particleNum = 500,
  image,
  size = 1,
  opacity = 0.4,
  containerSize = { x: 200, y: 250, z: 200 },
  retiring = false,
  onRetired,
}) {
  const pointsRef = useRef();

  // Kept in a ref so the fade effect does not need it as a dependency: callers
  // pass a closure over the entry id, which is a fresh function every render,
  // and re-running the effect would restart the fade from wherever it had got
  // to on every parent render.
  const retiredRef = useRef(onRetired);
  retiredRef.current = onRetired;

  // Shared, so this component does not dispose it -- the texture outlives any
  // single field and lives in a pool keyed to the image, which lasts as long
  // as the scene.
  const texture = useMemo(() => spriteTexture(image), [image]);

  const positions = useMemo(() => {
    const vertices = [];
    for (let p = 0; p < particleNum; p++) {
      const pX = -containerSize.x + Math.random() * (containerSize.x * 2);
      const pY = -containerSize.y + Math.random() * (containerSize.y * 2);
      // Bias Z distribution toward negative values (in front of camera at z=130)
      // Using power distribution to cluster more particles closer to camera
      const zRandom = Math.pow(Math.random(), 1.5); // Bias toward 0
      const pZ = -containerSize.z + zRandom * (containerSize.z * 2);
      vertices.push(pX, pY, pZ);
    }
    return new Float32Array(vertices);
  }, [particleNum, containerSize]);

  useEffect(() => {
    if (!pointsRef.current) return;

    // Initial fade-in animation
    gsap.from(pointsRef.current.material, {
      duration: 2,
      opacity: 0,
      size: 0,
      ease: 'quad.inOut',
      delay: 0.5,
    });

    // Scale animations on each axis
    const scaleXTween = gsap.to(pointsRef.current.scale, {
      duration: 30 + Math.random() * 20,
      x: 1 + Math.random() * 2,
      yoyo: true,
      repeat: -1,
      ease: 'back.inOut',
    });

    const scaleYTween = gsap.to(pointsRef.current.scale, {
      duration: 30 + Math.random() * 20,
      y: 1 + Math.random() * 2,
      yoyo: true,
      repeat: -1,
      ease: 'back.inOut',
    });

    const scaleZTween = gsap.to(pointsRef.current.scale, {
      duration: 30 + Math.random() * 20,
      z: 1 + Math.random() * 2,
      yoyo: true,
      repeat: -1,
      ease: 'back.inOut',
    });

    // Rotation animation
    const rotationTween = gsap.to(pointsRef.current.rotation, {
      duration: 100,
      y: -Math.PI * 2,
      repeat: -1,
      ease: 'none',
    });

    return () => {
      scaleXTween.kill();
      scaleYTween.kill();
      scaleZTween.kill();
      rotationTween.kill();
    };
  }, []);

  // Fading, rather than unmounting, is the whole reason this prop exists: see
  // useRetiringCount. The parent keeps the field mounted until onRetired fires.
  const settled = useRef(false);

  useEffect(() => {
    const material = pointsRef.current?.material;
    if (!material) return undefined;

    // Mount arrives here with retiring false, which is not a revival -- the
    // intro tween above is already handling that frame.
    if (!retiring && !settled.current) return undefined;
    settled.current = true;

    // Takes the intro tween with it if the field is retired before it has
    // finished arriving, which is common: the governor's first verdict can land
    // while the later fields are still fading in.
    gsap.killTweensOf(material);

    const tween = gsap.to(material, {
      duration: retiring ? RETIRE_DURATION : REVIVE_DURATION,
      opacity: retiring ? 0 : opacity,
      size: retiring ? 0 : size,
      ease: retiring ? 'quad.in' : 'quad.out',
      onComplete: () => {
        if (retiring) retiredRef.current?.();
      },
    });

    return () => tween.kill();
  }, [retiring, opacity, size]);

  if (!texture) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        map={texture}
        blending={THREE.AdditiveBlending}
        transparent
        opacity={opacity}
        depthWrite={false}
        fog={false}
      />
    </points>
  );
}
