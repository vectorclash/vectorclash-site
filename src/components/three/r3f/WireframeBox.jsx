import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';

function createBoxGridGeometry(size, segments) {
  const positions = [];
  const h = size / 2;
  const step = size / segments;

  const faces = [
    { ax1: 'x', ax2: 'y', fixed: 'z', fixedVal:  h },
    { ax1: 'x', ax2: 'y', fixed: 'z', fixedVal: -h },
    { ax1: 'y', ax2: 'z', fixed: 'x', fixedVal:  h },
    { ax1: 'y', ax2: 'z', fixed: 'x', fixedVal: -h },
    { ax1: 'x', ax2: 'z', fixed: 'y', fixedVal:  h },
    { ax1: 'x', ax2: 'z', fixed: 'y', fixedVal: -h },
  ];

  faces.forEach(({ ax1, ax2, fixed, fixedVal }) => {
    for (let i = 0; i <= segments; i++) {
      const t = -h + i * step;

      const s1 = { x: 0, y: 0, z: 0 };
      const e1 = { x: 0, y: 0, z: 0 };
      s1[ax2] = t; e1[ax2] = t;
      s1[ax1] = -h; e1[ax1] = h;
      s1[fixed] = fixedVal; e1[fixed] = fixedVal;
      positions.push(s1.x, s1.y, s1.z, e1.x, e1.y, e1.z);

      const s2 = { x: 0, y: 0, z: 0 };
      const e2 = { x: 0, y: 0, z: 0 };
      s2[ax1] = t; e2[ax1] = t;
      s2[ax2] = -h; e2[ax2] = h;
      s2[fixed] = fixedVal; e2[fixed] = fixedVal;
      positions.push(s2.x, s2.y, s2.z, e2.x, e2.y, e2.z);
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

export default function WireframeBox({ size = 2000, depth = 12, color = '#ccff00' }) {
  const meshRef = useRef();
  const hueRef = useRef(0);
  const rotationRef = useRef({
    x: Math.random() * Math.PI,
    y: Math.random() * Math.PI,
    z: Math.random() * Math.PI,
  });

  const geometry = useMemo(() => createBoxGridGeometry(size, depth), [size, depth]);

  useEffect(() => {
    if (!meshRef.current) return;

    meshRef.current.rotation.set(
      rotationRef.current.x,
      rotationRef.current.y,
      rotationRef.current.z
    );

    gsap.from(meshRef.current.material, {
      duration: 2,
      opacity: 0,
      ease: 'quad.inOut',
      delay: 0.5,
    });

    const rotationTween = gsap.to(meshRef.current.rotation, {
      duration: 150,
      z: rotationRef.current.z + Math.PI * 2,
      repeat: -1,
      ease: 'none',
    });

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

    return () => {
      isActive = false;
      rotationTween.kill();
      gsap.killTweensOf(hueRef);
    };
  }, []);

  useFrame(() => {});

  return (
    <lineSegments ref={meshRef} geometry={geometry}>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={0.1}
        fog={false}
      />
    </lineSegments>
  );
}
