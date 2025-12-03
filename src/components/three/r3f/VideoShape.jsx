import { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import tinycolor from 'tinycolor2';

export default function VideoShape({ url, size = 50 }) {
  const groupRef = useRef();
  const meshRef = useRef();
  const placeholderRef = useRef();
  const [videoTexture, setVideoTexture] = useState(null);
  const [videoLoaded, setVideoLoaded] = useState(false);

  const placeholderColor = useMemo(() => tinycolor.random().toHexString(), []);

  useEffect(() => {
    if (!url) return;

    const videoElement = document.createElement('video');
    videoElement.setAttribute('autoplay', '');
    videoElement.setAttribute('loop', '');
    videoElement.setAttribute('muted', '');
    videoElement.setAttribute('playsinline', '');
    videoElement.setAttribute('crossorigin', 'anonymous');

    const sourceElement = document.createElement('source');
    sourceElement.src = url;
    sourceElement.type = 'video/mp4';
    videoElement.appendChild(sourceElement);

    const texture = new THREE.VideoTexture(videoElement);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBAFormat;

    const handleCanPlay = () => {
      setVideoTexture(texture);
      setVideoLoaded(true);
      videoElement.muted = true;
      videoElement.play();
    };

    videoElement.addEventListener('canplay', handleCanPlay);

    return () => {
      videoElement.removeEventListener('canplay', handleCanPlay);
      videoElement.pause();
      texture.dispose();
    };
  }, [url]);

  useEffect(() => {
    if (!videoLoaded || !meshRef.current || !placeholderRef.current) return;

    // Animate video mesh in
    gsap.from(meshRef.current.scale, {
      duration: 1,
      x: 0.0001,
      y: 0.0001,
      z: 0.0001,
      ease: 'back.out',
    });

    // Animate placeholder out
    gsap.to(placeholderRef.current.scale, {
      duration: 1,
      x: 0.0001,
      y: 0.0001,
      z: 0.0001,
      ease: 'back.in',
    });
  }, [videoLoaded]);

  return (
    <group ref={groupRef}>
      {/* Placeholder mesh */}
      <mesh ref={placeholderRef} scale={[0.9, 0.9, 0.9]}>
        <tetrahedronGeometry args={[size]} />
        <meshStandardMaterial color={placeholderColor} flatShading />
      </mesh>

      {/* Video mesh */}
      {videoTexture && (
        <mesh ref={meshRef}>
          <tetrahedronGeometry args={[size]} />
          <meshBasicMaterial map={videoTexture} color={0xffffff} />
        </mesh>
      )}
    </group>
  );
}
