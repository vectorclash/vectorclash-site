import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';

export default function WireframeBox({ size = 2000, depth = 12, color = '#ccff00' }) {
  const meshRef = useRef();
  const hueRef = useRef(0);

  useEffect(() => {
    if (!meshRef.current) return;

    // Initial opacity animation
    gsap.from(meshRef.current.material, {
      duration: 2,
      opacity: 0,
      ease: 'quad.inOut',
      delay: 0.5,
    });

    // Rotation animation
    const initialRotation = meshRef.current.rotation.z;
    gsap.to(meshRef.current.rotation, {
      duration: 150,
      z: -initialRotation + Math.PI * 2,
      repeat: -1,
      ease: 'none',
    });

    // Color change animation
    const changeColor = () => {
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
  }, []);

  const randomRotation = [
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI,
  ];

  return (
    <mesh ref={meshRef} rotation={randomRotation}>
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
