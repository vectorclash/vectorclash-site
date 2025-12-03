import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import CanvasRadialGradient from '../CanvasRadialGradient';

export default function ParticleField({
  particleNum = 500,
  image,
  size = 1,
  opacity = 0.4,
  containerSize = { x: 200, y: 250, z: 200 },
}) {
  const pointsRef = useRef();

  const texture = useMemo(() => {
    if (!image) return null;

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
  }, [image]);

  // Cleanup texture on unmount
  useEffect(() => {
    return () => {
      if (texture) {
        texture.dispose();
      }
    };
  }, [texture]);

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
