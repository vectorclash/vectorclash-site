import { useRef, useEffect, useState, Suspense } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import gsap from 'gsap';
import WireframeBox from './WireframeBox';
import ShapeSwarm from './ShapeSwarm';
import BrightCluster from './BrightCluster';
import ParticleField from './ParticleField';
import StarLarge from '../../../images/star-sprite-large.png';
import StarSmall from '../../../images/star-sprite-small.png';

function Scene({ colors }) {
  const groupRef = useRef();
  const { camera, gl } = useThree();
  const [starSmallImage, setStarSmallImage] = useState(null);
  const [starLargeImage, setStarLargeImage] = useState(null);

  const middleColor = Math.floor(colors.length / 2);
  const fogColor = colors[middleColor].toHexString();

  useEffect(() => {
    // Load star images
    const loader = new THREE.ImageLoader();
    loader.load(StarSmall, setStarSmallImage);
    loader.load(StarLarge, setStarLargeImage);
  }, []);

  useEffect(() => {
    if (!groupRef.current) return;

    // Make visible and animate in
    gsap.to(groupRef.current, {
      duration: 0.1,
      delay: 0.5,
      onStart: () => {
        groupRef.current.visible = true;
      },
    });

    gsap.to(groupRef.current.scale, {
      duration: 6,
      x: 1,
      y: 1,
      z: 1,
      ease: 'back.out',
      delay: 1,
    });
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const parentElement = gl.domElement.parentNode;
      if (!parentElement) return;

      const offsetY = window.scrollY - parentElement.getBoundingClientRect().y;

      gsap.to(camera.position, {
        duration: 0.5,
        y: -offsetY * 0.15,
        ease: 'quad.out',
      });

      gsap.to(groupRef.current.rotation, {
        duration: 0.5,
        y: -offsetY * 0.0007,
        ease: 'quad.out',
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [camera, gl]);

  return (
    <>
      <fog attach="fog" args={[fogColor, 1, 450]} />
      <ambientLight intensity={1} color={0xfafafa} />
      <directionalLight intensity={0.5} color={fogColor} />

      <group ref={groupRef} scale={[0.00002, 0.00002, 0.00002]} visible={false}>
        <WireframeBox size={2000} depth={12} color={fogColor} />
        <ShapeSwarm amount={5} containerSize={{ x: 120, y: 200, z: 50 }} />
        <ShapeSwarm amount={5} containerSize={{ x: 30, y: 75, z: 20 }} />
        <Suspense fallback={null}>
          <BrightCluster />
        </Suspense>

        {/* Small particles */}
        {starSmallImage &&
          Array.from({ length: 50 }).map((_, i) => (
            <ParticleField
              key={`small-${i}`}
              particleNum={500}
              image={starSmallImage}
              size={0.5 + Math.random() * 1}
              opacity={0.4}
              containerSize={{ x: 200, y: 250, z: 200 }}
            />
          ))}

        {/* Large particles */}
        {starLargeImage &&
          Array.from({ length: 20 }).map((_, i) => (
            <ParticleField
              key={`large-${i}`}
              particleNum={5}
              image={starLargeImage}
              size={10 + Math.random() * 30}
              opacity={0.7}
              containerSize={{ x: 150, y: 150, z: 150 }}
            />
          ))}
      </group>

      <EffectComposer>
        <Bloom
          intensity={1}
          luminanceThreshold={0.3}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

export default function HeaderScene({ colors }) {
  return (
    <Canvas
      camera={{ position: [0, 2, 130], fov: 50, near: 0.1, far: 20000 }}
      gl={{
        antialias: true,
        alpha: true,
        physicallyCorrectLights: false,
        shadowMap: {
          enabled: true,
          type: THREE.PCFSoftShadowMap,
        },
      }}
      style={{ background: 'transparent' }}
    >
      <Scene colors={colors} />
    </Canvas>
  );
}
