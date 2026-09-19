import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { MotionPathPlugin } from 'gsap/all';
import CanvasLinearGradient from '../CanvasLinearGradient';

gsap.registerPlugin(MotionPathPlugin);

// The opacity a shape settles at once it is clear of the camera.
const BASE_OPACITY = 0.9;

// How far in front of a shape's own surface the fade runs, in world units. Long
// enough that a shape on its way through the camera has dissolved well before
// it can fill the frame, short enough that it is still solid out where it reads
// as part of the swarm.
const FADE_BAND = 90;

// Reused every frame by every shape: a fresh Vector3 per shape per frame is
// three hundred allocations a second for two numbers.
const worldPosition = new THREE.Vector3();
const worldScale = new THREE.Vector3();

function SingleShape({ geometry, containerSize, positionRange = 250, speed = 10 }) {
  const meshRef = useRef();
  const materialRef = useRef();
  const camera = useThree((state) => state.camera);

  // Geometry is shared across the swarm and never changes shape, so its radius
  // is worth solving once rather than reading a possibly-unbuilt bounding
  // sphere mid-frame.
  const geometryRadius = useMemo(() => {
    geometry.computeBoundingSphere();
    return geometry.boundingSphere?.radius ?? 1;
  }, [geometry]);

  const texture = useMemo(() => {
    const gradient = new CanvasLinearGradient(256, 256);
    const tex = new THREE.Texture(gradient);
    tex.needsUpdate = true;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }, []);

  // Cleanup texture on unmount
  useEffect(() => {
    return () => {
      if (texture) {
        texture.dispose();
      }
    };
  }, [texture]);

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

    let isActive = true;

    const moveShape = () => {
      if (!isActive || !meshRef.current) return;

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

    return () => {
      isActive = false;
      if (meshRef.current) {
        gsap.killTweensOf(meshRef.current.position);
      }
    };
  }, [positionRange, speed]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    if (mesh.parent) {
      mesh.lookAt(
        mesh.parent.position.x,
        mesh.parent.position.y,
        mesh.parent.position.z
      );
    }

    // Left alone, a shape whose path crosses the camera darkens the whole
    // frame for a second on its way past. Fading on distance turns that into a
    // dissolve: the shape thins out as it approaches and is gone before it can
    // obscure anything. Measured against its own world radius, because the
    // swarm rolls a geometry size and both groups above it are scaling -- a
    // fixed threshold would catch a small shape too late and a large one far
    // too early.
    const radius = geometryRadius * mesh.getWorldScale(worldScale).x;
    const distance = mesh.getWorldPosition(worldPosition).distanceTo(camera.position);
    const fadeStart = radius * 1.5;
    const visibility = THREE.MathUtils.smoothstep(distance, fadeStart, fadeStart + FADE_BAND);

    if (materialRef.current) materialRef.current.opacity = BASE_OPACITY * visibility;

    // Fully faded is worth skipping outright rather than drawing at zero.
    mesh.visible = visibility > 0.001;
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
        ref={materialRef}
        map={texture}
        flatShading={false}
        transparent
        opacity={BASE_OPACITY}
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
    const rotationTween = gsap.to(groupRef.current.rotation, {
      duration: 50,
      y: Math.PI * 2,
      repeat: -1,
      ease: 'none',
    });

    // Group scale animation
    const ranScale = 1 + Math.random() * 2;
    const scaleTween = gsap.to(groupRef.current.scale, {
      duration: 30 + Math.random() * 20,
      x: ranScale,
      y: ranScale,
      z: ranScale,
      yoyo: true,
      repeat: -1,
      ease: 'back.inOut',
    });

    return () => {
      rotationTween.kill();
      scaleTween.kill();
    };
  }, []);

  // Cleanup geometry on unmount
  useEffect(() => {
    return () => {
      if (geometry) {
        geometry.dispose();
      }
    };
  }, [geometry]);

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
