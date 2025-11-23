import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { MotionPathPlugin } from 'gsap/all';
import RandomCanvasLinearGradient from '../RandomCanvasLinearGradient';

gsap.registerPlugin(MotionPathPlugin);

function SingleShape({ geometry, containerSize, positionRange = 250, speed = 10 }) {
  const meshRef = useRef();

  const texture = useMemo(() => {
    const gradient = new RandomCanvasLinearGradient(256, 256);
    const tex = new THREE.Texture(gradient);
    tex.needsUpdate = true;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }, []);

  const initialPosition = useMemo(() => ({
    x: -containerSize.x + Math.random() * (containerSize.x * 2),
    y: -containerSize.y + Math.random() * (containerSize.y * 2),
    z: -containerSize.z + Math.random() * (containerSize.z * 2),
  }), [containerSize]);

  const randomRotation = useMemo(() => [
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI,
  ], []);

  const randomScale = useMemo(() => 0.1 + Math.random() * 0.2, []);

  useEffect(() => {
    if (!meshRef.current) return;

    const moveShape = () => {
      const path = [];
      for (let i = 0; i < 3; i++) {
        path.push({
          x: -(positionRange / 2) + Math.random() * positionRange,
          y: -(positionRange / 2) + Math.random() * positionRange,
          z: -(positionRange / 2) + Math.random() * positionRange,
        });
      }

      gsap.to(meshRef.current.position, {
        duration: speed + Math.random() * (speed * 5),
        motionPath: { path },
        ease: 'quad.inOut',
        onComplete: moveShape,
      });
    };

    moveShape();
  }, [positionRange, speed]);

  useFrame((state) => {
    if (meshRef.current && meshRef.current.parent) {
      meshRef.current.lookAt(
        meshRef.current.parent.position.x,
        meshRef.current.parent.position.y,
        meshRef.current.parent.position.z
      );
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={[initialPosition.x, initialPosition.y, initialPosition.z]}
      rotation={randomRotation}
      scale={randomScale}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        map={texture}
        flatShading={false}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}

export default function ShapeSwarm({ amount = 5, containerSize = { x: 120, y: 200, z: 50 } }) {
  const groupRef = useRef();

  const geometry = useMemo(() => {
    const geometryType = Math.floor(Math.random() * 3);
    const ranSize = 10 + Math.random() * 60;

    switch (geometryType) {
      case 0:
        return new THREE.TetrahedronGeometry(ranSize);
      case 1:
        return new THREE.IcosahedronGeometry(ranSize);
      case 2:
        return new THREE.OctahedronGeometry(ranSize);
      default:
        return new THREE.TetrahedronGeometry(ranSize);
    }
  }, []);

  useEffect(() => {
    if (!groupRef.current) return;

    // Group rotation animation
    gsap.to(groupRef.current.rotation, {
      duration: 50,
      y: Math.PI * 2,
      repeat: -1,
      ease: 'none',
    });

    // Group scale animation
    const ranScale = 1 + Math.random() * 2;
    gsap.to(groupRef.current.scale, {
      duration: 30 + Math.random() * 20,
      x: ranScale,
      y: ranScale,
      z: ranScale,
      yoyo: true,
      repeat: -1,
      ease: 'back.inOut',
    });
  }, []);

  return (
    <group ref={groupRef}>
      {Array.from({ length: amount }).map((_, i) => (
        <SingleShape
          key={i}
          geometry={geometry}
          containerSize={containerSize}
        />
      ))}
    </group>
  );
}
