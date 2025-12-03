import { useRef, useEffect, useState, Suspense } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import gsap from 'gsap';
import WireframeBox from './WireframeBox';
import ShapeSwarm from './ShapeSwarm';
import BrightCluster from './BrightCluster';
import ParticleField from './ParticleField';
import GradientGenerator from '../../utils/GradientGenerator';
import StarLarge from '../../../images/star-sprite-large.png';
import StarSmall from '../../../images/star-sprite-small.png';
import { getParticleConfig, shouldEnableBloom, shouldEnableAntialias } from '../../utils/PerformanceDetector';

// Animated gradient background component
function AnimatedGradientBackground() {
  const meshRef = useRef();
  const materialRef = useRef();
  const timeoutRef = useRef(null);

  // Initialize shader material once
  useEffect(() => {
    // Generate initial colors
    let colorAmount = 3 + Math.round(Math.random() * 3);
    const initialColors = new GradientGenerator(colorAmount, false).colors;

    const maxColorSlots = 10;
    const uniforms = {
      uTime: { value: 0 },
      uMixFactor: { value: 0 }, // 0 = colorSet1, 1 = colorSet2
      uColorCount1: { value: initialColors.length },
      uColorCount2: { value: initialColors.length },
    };

    // Initialize both color sets with same colors
    for (let i = 0; i < maxColorSlots; i++) {
      const color = initialColors[i % initialColors.length];
      const threeColor = new THREE.Color(color.toHexString());
      uniforms[`uColor1_${i}`] = { value: threeColor.clone() };
      uniforms[`uColor2_${i}`] = { value: threeColor.clone() };
    }

    // Build shader
    let colorDeclarations = '';
    for (let i = 0; i < maxColorSlots; i++) {
      colorDeclarations += `uniform vec3 uColor1_${i};\n        `;
      colorDeclarations += `uniform vec3 uColor2_${i};\n        `;
    }

    const fragmentShader = `
        uniform float uTime;
        uniform float uMixFactor;
        uniform float uColorCount1;
        uniform float uColorCount2;
        ${colorDeclarations}
        varying vec2 vUv;

        void main() {
          // Create 42-degree diagonal gradient
          float angle = 0.733;
          float diagonal = vUv.x * cos(angle) + vUv.y * sin(angle);
          diagonal += sin(uTime * 0.15) * 0.05;
          diagonal = clamp(diagonal, 0.0, 1.0);

          // Get current color count
          float colorCount = mix(uColorCount1, uColorCount2, uMixFactor);
          int count = int(colorCount);

          // Blend gradient from set 1
          vec3 color1 = uColor1_0;
          for (int i = 1; i < 10; i++) {
            if (i >= int(uColorCount1)) break;
            float start = float(i - 1) / (uColorCount1 - 1.0);
            float end = float(i) / (uColorCount1 - 1.0);
            float mixAmount = smoothstep(start, end, diagonal);

            if (i == 1) color1 = mix(uColor1_0, uColor1_1, mixAmount);
            else if (i == 2) color1 = mix(color1, uColor1_2, mixAmount);
            else if (i == 3) color1 = mix(color1, uColor1_3, mixAmount);
            else if (i == 4) color1 = mix(color1, uColor1_4, mixAmount);
            else if (i == 5) color1 = mix(color1, uColor1_5, mixAmount);
            else if (i == 6) color1 = mix(color1, uColor1_6, mixAmount);
            else if (i == 7) color1 = mix(color1, uColor1_7, mixAmount);
            else if (i == 8) color1 = mix(color1, uColor1_8, mixAmount);
            else if (i == 9) color1 = mix(color1, uColor1_9, mixAmount);
          }

          // Blend gradient from set 2
          vec3 color2 = uColor2_0;
          for (int i = 1; i < 10; i++) {
            if (i >= int(uColorCount2)) break;
            float start = float(i - 1) / (uColorCount2 - 1.0);
            float end = float(i) / (uColorCount2 - 1.0);
            float mixAmount = smoothstep(start, end, diagonal);

            if (i == 1) color2 = mix(uColor2_0, uColor2_1, mixAmount);
            else if (i == 2) color2 = mix(color2, uColor2_2, mixAmount);
            else if (i == 3) color2 = mix(color2, uColor2_3, mixAmount);
            else if (i == 4) color2 = mix(color2, uColor2_4, mixAmount);
            else if (i == 5) color2 = mix(color2, uColor2_5, mixAmount);
            else if (i == 6) color2 = mix(color2, uColor2_6, mixAmount);
            else if (i == 7) color2 = mix(color2, uColor2_7, mixAmount);
            else if (i == 8) color2 = mix(color2, uColor2_8, mixAmount);
            else if (i == 9) color2 = mix(color2, uColor2_9, mixAmount);
          }

          // Crossfade between the two gradients
          vec3 finalColor = mix(color1, color2, uMixFactor);
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `;

    materialRef.current = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // Schedule color changes
    const scheduleNextChange = () => {
      const delay = (5 + Math.random() * 10) * 1000;
      timeoutRef.current = setTimeout(() => {
        if (!materialRef.current) return;

        // Generate new colors
        let newColorAmount = 3 + Math.round(Math.random() * 3);
        const newColors = new GradientGenerator(newColorAmount, false).colors;

        // Determine which set to update (alternate between 1 and 2)
        const currentMix = materialRef.current.uniforms.uMixFactor.value;
        const targetSet = currentMix < 0.5 ? 2 : 1;

        // Update the inactive set with new colors
        for (let i = 0; i < maxColorSlots; i++) {
          const color = newColors[i % newColors.length];
          const threeColor = new THREE.Color(color.toHexString());
          materialRef.current.uniforms[`uColor${targetSet}_${i}`].value.copy(threeColor);
        }
        materialRef.current.uniforms[`uColorCount${targetSet}`].value = newColors.length;

        // Animate crossfade
        gsap.to(materialRef.current.uniforms.uMixFactor, {
          value: targetSet === 2 ? 1 : 0,
          duration: 5,
          ease: 'power2.inOut',
        });

        scheduleNextChange();
      }, delay);
    };

    scheduleNextChange();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -800]} renderOrder={-1}>
      <planeGeometry args={[5000, 5000]} />
      {materialRef.current && <primitive object={materialRef.current} attach="material" />}
    </mesh>
  );
}

function Scene({ colors }) {
  const groupRef = useRef();
  const { camera, gl } = useThree();
  const [starSmallImage, setStarSmallImage] = useState(null);
  const [starLargeImage, setStarLargeImage] = useState(null);

  const middleColor = Math.floor(colors.length / 2);
  const fogColor = colors[middleColor].toHexString();

  // Get performance-based configuration
  const particleConfig = getParticleConfig();
  const enableBloom = shouldEnableBloom();

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
    const scrollTarget = { offsetY: 0 };
    let cameraTween = null;
    let rotationTween = null;

    const handleScroll = () => {
      const parentElement = gl.domElement.parentNode;
      if (!parentElement) return;

      scrollTarget.offsetY = window.scrollY - parentElement.getBoundingClientRect().y;

      // Kill existing tweens to prevent buildup
      if (cameraTween) cameraTween.kill();
      if (rotationTween) rotationTween.kill();

      cameraTween = gsap.to(camera.position, {
        duration: 0.5,
        y: -scrollTarget.offsetY * 0.15,
        ease: 'quad.out',
      });

      rotationTween = gsap.to(groupRef.current.rotation, {
        duration: 0.5,
        y: -scrollTarget.offsetY * 0.0007,
        ease: 'quad.out',
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (cameraTween) cameraTween.kill();
      if (rotationTween) rotationTween.kill();
    };
  }, [camera, gl]);

  return (
    <>
      <AnimatedGradientBackground />
      <fog attach="fog" args={[fogColor, 1, 1000]} />
      <ambientLight intensity={0.2} color={0xfafafa} />
      <directionalLight intensity={0.2} color={fogColor} />

      <group ref={groupRef} scale={[0.00002, 0.00002, 0.00002]} visible={false}>
        <WireframeBox size={2000} depth={12} color={fogColor} />
        <ShapeSwarm amount={5} containerSize={{ x: 120, y: 200, z: 50 }} />
        <ShapeSwarm amount={5} containerSize={{ x: 30, y: 75, z: 20 }} />
        <Suspense fallback={null}>
          <BrightCluster />
        </Suspense>

        {/* Small particles - optimized for visibility in front of camera */}
        {starSmallImage &&
          Array.from({ length: particleConfig.smallFields }).map((_, i) => (
            <ParticleField
              key={`small-${i}`}
              particleNum={particleConfig.smallParticles}
              image={starSmallImage}
              size={0.8 + Math.random() * 1.5}
              opacity={0.6}
              containerSize={{ x: 150, y: 200, z: 350 }}
            />
          ))}

        {/* Large particles - optimized for visibility */}
        {starLargeImage &&
          Array.from({ length: particleConfig.largeFields }).map((_, i) => (
            <ParticleField
              key={`large-${i}`}
              particleNum={particleConfig.largeParticles}
              image={starLargeImage}
              size={15 + Math.random() * 35}
              opacity={0.8}
              containerSize={{ x: 120, y: 150, z: 300 }}
            />
          ))}
      </group>

      {enableBloom && (
        <EffectComposer>
          <Bloom
            intensity={1}
            luminanceThreshold={0.3}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      )}
    </>
  );
}

export default function HeaderScene({ colors }) {
  const middleColor = Math.floor(colors.length / 2);
  const fallbackColor = colors[middleColor].toHexString();
  const enableAntialias = shouldEnableAntialias();

  return (
    <Canvas
      camera={{ position: [0, 2, 130], fov: 60, near: 0.1, far: 20000 }}
      gl={{
        antialias: enableAntialias,
        alpha: false,
        physicallyCorrectLights: false,
        shadowMap: {
          enabled: true,
          type: THREE.PCFSoftShadowMap,
        },
      }}
      style={{ background: fallbackColor }}
    >
      <Scene colors={colors} />
    </Canvas>
  );
}
