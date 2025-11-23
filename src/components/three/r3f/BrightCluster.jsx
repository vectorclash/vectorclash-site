import { useRef, useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { MotionPathPlugin } from 'gsap/all';
import tinycolor from 'tinycolor2';
import merkaba from '../../../assets/models/basic-merkaba.glb';

gsap.registerPlugin(MotionPathPlugin);

function MerkabaShape({ geometry, positionRange, speed }) {
  const meshRef = useRef();

  useEffect(() => {
    if (!meshRef.current) return;

    // Set initial random position within range
    meshRef.current.position.set(
      -(positionRange / 2) + Math.random() * positionRange,
      -(positionRange / 2) + Math.random() * positionRange,
      -(positionRange / 2) + Math.random() * positionRange
    );

    const moveShape = () => {
      gsap.to(meshRef.current.position, {
        duration: speed + Math.random() * (speed * 5),
        x: -(positionRange / 2) + Math.random() * positionRange,
        y: -(positionRange / 2) + Math.random() * positionRange,
        z: -(positionRange / 2) + Math.random() * positionRange,
        ease: 'quad.inOut',
        onComplete: moveShape,
      });
    };

    const scaleShape = () => {
      const scaleMin = window.innerWidth < 400 ? 1 : 2;
      const scaleMax = window.innerWidth < 400 ? 2.5 : 3;
      const ranScale = scaleMin + Math.random() * scaleMax;
      const ranTime = 1 + Math.random() * 10;

      gsap.to(meshRef.current.scale, {
        duration: ranTime,
        x: ranScale,
        y: ranScale,
        z: ranScale,
        ease: 'bounce.inOut',
        onComplete: scaleShape,
      });
    };

    moveShape();
    scaleShape();
  }, [positionRange, speed]);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.lookAt(0, 0, 0);
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={0x333333} metalness={0.8} roughness={0.2} />
    </mesh>
  );
}

function BrightShape({ color, initialPosition }) {
  const groupRef = useRef();
  const spotLightRef = useRef();
  const shapeSize = useMemo(() => 0.5 + Math.round(Math.random() * 2), []);

  useEffect(() => {
    if (!groupRef.current) return;

    const moveShape = () => {
      const positionRange = 150;
      const speed = 2;
      const path = [];
      for (let i = 0; i < 3; i++) {
        path.push({
          x: -(positionRange / 2) + Math.random() * positionRange,
          y: -(positionRange / 2) + Math.random() * positionRange,
          z: -(positionRange / 2) + Math.random() * positionRange,
        });
      }

      gsap.to(groupRef.current.position, {
        duration: speed + Math.random() * (speed * 5),
        motionPath: { path },
        ease: 'quad.inOut',
        onComplete: moveShape,
      });
    };

    moveShape();
  }, []);

  useFrame(() => {
    if (spotLightRef.current) {
      spotLightRef.current.target.position.set(0, 0, 0);
      spotLightRef.current.target.updateMatrixWorld();
    }
  });

  return (
    <group ref={groupRef} position={initialPosition}>
      <mesh>
        <icosahedronGeometry args={[shapeSize, 2]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1}
          fog={false}
          toneMapped={false}
        />
      </mesh>
      <spotLight
        ref={spotLightRef}
        color={color}
        intensity={2000}
        distance={500}
        angle={Math.PI / 4}
        penumbra={0.3}
        decay={1}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
      />
    </group>
  );
}

export default function BrightCluster() {
  const groupRef = useRef();
  const { nodes } = useGLTF(merkaba);

  const geometry = useMemo(() => {
    return nodes?.Scene?.children?.[0]?.geometry || new THREE.SphereGeometry(1);
  }, [nodes]);

  const colors = useMemo(() => {
    return tinycolor('#CCFF00').spin(Math.random() * 360).tetrad();
  }, []);

  const brightShapePositions = useMemo(() => {
    return colors.map(() => [
      -50 + Math.random() * 100,
      -50 + Math.random() * 100,
      -50 + Math.random() * 100,
    ]);
  }, [colors]);

  useEffect(() => {
    if (!groupRef.current) return;

    gsap.to(groupRef.current.rotation, {
      duration: 20,
      y: Math.PI * 2,
      ease: 'none',
      repeat: -1,
    });
  }, []);

  return (
    <group ref={groupRef}>
      {/* Merkaba meshes */}
      {Array.from({ length: 10 }).map((_, i) => (
        <MerkabaShape
          key={`merkaba-${i}`}
          geometry={geometry}
          positionRange={10}
          speed={100}
        />
      ))}

      {/* Bright shapes with lights */}
      {colors.map((color, i) => (
        <BrightShape
          key={`bright-${i}`}
          color={color.toHexString()}
          initialPosition={brightShapePositions[i]}
        />
      ))}
    </group>
  );
}

// Preload the GLTF model
useGLTF.preload(merkaba);
