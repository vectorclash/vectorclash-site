import { useRef, useEffect, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import tinycolor from 'tinycolor2';

const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D texture1;
  uniform sampler2D texture2;
  uniform float transition;
  uniform float displacement;
  uniform vec2 resolution;

  varying vec2 vUv;

  // Simplex noise function for displacement
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    vec2 uv = vUv;

    // Create displacement based on transition progress
    float n = snoise(uv * 3.0 + transition * 2.0);
    float disp = n * displacement * (1.0 - abs(transition - 0.5) * 2.0);

    // Apply displacement to UV coordinates
    vec2 uvDisplaced1 = uv + vec2(disp, disp * 0.5);
    vec2 uvDisplaced2 = uv - vec2(disp * 0.5, disp);

    // Sample textures
    vec4 color1 = texture2D(texture1, uvDisplaced1);
    vec4 color2 = texture2D(texture2, uvDisplaced2);

    // Mix based on transition progress with displacement influence
    float mixFactor = smoothstep(0.0, 1.0, transition + n * 0.3);
    vec4 finalColor = mix(color1, color2, mixFactor);

    gl_FragColor = finalColor;
  }
`;

export default function TransitionShape({ size = 300, textureURL, onLoadComplete }) {
  const groupRef = useRef();
  const meshRef = useRef();
  const materialRef = useRef();
  const [currentTexture, setCurrentTexture] = useState(textureURL);
  const [nextTexture, setNextTexture] = useState(textureURL);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Load both textures
  const texture1 = useTexture(currentTexture, (loadedTexture) => {
    loadedTexture.wrapS = THREE.RepeatWrapping;
    loadedTexture.wrapT = THREE.RepeatWrapping;
    loadedTexture.repeat.x = -1;
    if (onLoadComplete && !isTransitioning) onLoadComplete();
  });

  const texture2 = useTexture(nextTexture, (loadedTexture) => {
    loadedTexture.wrapS = THREE.RepeatWrapping;
    loadedTexture.wrapT = THREE.RepeatWrapping;
    loadedTexture.repeat.x = -1;
  });

  const wireframeColors = useMemo(() => ({
    color1: tinycolor('#CCFF00').spin(Math.random() * 360).toHexString(),
    color2: tinycolor('#CCFF00').spin(Math.random() * 360).toHexString(),
  }), []);

  // Shader uniforms
  const uniforms = useMemo(
    () => ({
      texture1: { value: texture1 },
      texture2: { value: texture2 },
      transition: { value: 0.0 },
      displacement: { value: 0.2 },
      resolution: { value: new THREE.Vector2(1, 1) },
    }),
    []
  );

  // Handle texture changes with transition
  useEffect(() => {
    if (textureURL !== currentTexture && textureURL !== nextTexture) {
      setNextTexture(textureURL);
      setIsTransitioning(true);

      // Animate transition
      if (materialRef.current) {
        gsap.to(materialRef.current.uniforms.transition, {
          value: 1.0,
          duration: 1.2,
          ease: 'power2.inOut',
          onComplete: () => {
            setCurrentTexture(textureURL);
            materialRef.current.uniforms.transition.value = 0.0;
            setIsTransitioning(false);
            if (onLoadComplete) onLoadComplete();
          },
        });
      }
    }
  }, [textureURL, currentTexture, nextTexture, onLoadComplete]);

  // Update uniforms when textures change
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.texture1.value = texture1;
      materialRef.current.uniforms.texture2.value = texture2;
    }
  }, [texture1, texture2]);

  useEffect(() => {
    if (!groupRef.current || !meshRef.current) return;

    // Initial scale animation
    gsap.from(groupRef.current.scale, {
      duration: 0.5,
      x: 0.8,
      y: 0.8,
      z: 0.8,
      ease: 'quad.inOut',
    });

    // Initial opacity animation
    gsap.from(meshRef.current.material, {
      duration: 0.5,
      opacity: 0,
      ease: 'quad.inOut',
    });
  }, []);

  return (
    <group ref={groupRef}>
      {/* Main textured mesh with shader */}
      <mesh ref={meshRef}>
        <boxGeometry args={[size, size, size, 6, 6, 6]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          side={THREE.BackSide}
          transparent
          opacity={1}
        />
      </mesh>

      {/* Wireframe mesh 1 */}
      <mesh scale={[0.9, 0.9, 0.9]}>
        <boxGeometry args={[size, size, size, 6, 6, 6]} />
        <meshBasicMaterial
          color={wireframeColors.color1}
          wireframe
          transparent
          opacity={0.1}
        />
      </mesh>

      {/* Wireframe mesh 2 */}
      <mesh scale={[0.95, 0.95, 0.95]}>
        <boxGeometry args={[size, size, size, 2, 2, 2]} />
        <meshBasicMaterial
          color={wireframeColors.color2}
          wireframe
          transparent
          opacity={0.4}
        />
      </mesh>
    </group>
  );
}
