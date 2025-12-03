import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';

export default function WireframeBox({ size = 2000, depth = 12, color = '#ccff00' }) {
  const meshRef = useRef();
  const hueRef = useRef(0);
  const rotationRef = useRef({
    x: Math.random() * Math.PI,
    y: Math.random() * Math.PI,
    z: Math.random() * Math.PI,
  });

  useEffect(() => {
    if (!meshRef.current) return;

    // Set initial rotation
    meshRef.current.rotation.set(
      rotationRef.current.x,
      rotationRef.current.y,
      rotationRef.current.z
    );

    // Initial opacity animation
    gsap.from(meshRef.current.material, {
      duration: 2,
      opacity: 0,
      ease: 'quad.inOut',
      delay: 0.5,
    });

    // Rotation animation
    const rotationTween = gsap.to(meshRef.current.rotation, {
      duration: 150,
      z: rotationRef.current.z + Math.PI * 2,
      repeat: -1,
      ease: 'none',
    });

    // Color change animation with cleanup flag
    let isActive = true;
    const changeColor = () => {
      if (!isActive) return;

      gsap.to(hueRef, {
        current: Math.random(),
        duration: 5 + Math.random() * 20,
        ease: 'quad.inOut',
        onUpdate: () => {
          if (meshRef.current) {
            meshRef.current.material.color.setHSL(hueRef.current, 1.0, 0.5);
          }
        },
        onComplete: changeColor,
      });
    };
    changeColor();

    // Cleanup
    return () => {
      isActive = false;
      rotationTween.kill();
      gsap.killTweensOf(hueRef);
    };
  }, []);

  useFrame(() => {
    // Ensure GSAP maintains control by not interfering with rotation
    // This helps prevent React Three Fiber from overwriting GSAP animations
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[size, size, size, depth, depth, depth]} />
      <meshBasicMaterial
        color={color}
        side={THREE.DoubleSide}
        wireframe
        transparent
        opacity={0.1}
        fog={false}
      />
    </mesh>
  );
}
