import { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import tinycolor from 'tinycolor2';

export default function VideoShape({ urls = [], size = 50 }) {
  const meshRef = useRef();
  const placeholderRef = useRef();
  const videoElementRef = useRef(null);
  const [videoTexture, setVideoTexture] = useState(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const placeholderColor = useMemo(() => tinycolor.random().toHexString(), []);

  // Create the video element and texture once on mount
  useEffect(() => {
    if (!urls || urls.length === 0) return;

    const videoElement = document.createElement('video');
    videoElement.muted = true;
    videoElement.setAttribute('playsinline', '');
    videoElement.setAttribute('crossorigin', 'anonymous');
    videoElementRef.current = videoElement;

    const texture = new THREE.VideoTexture(videoElement);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBAFormat;

    const handleCanPlay = () => {
      videoElement.play();
      setVideoTexture(texture);
      setVideoLoaded(true);
    };

    const handleEnded = () => {
      if (urls.length === 1) {
        videoElement.play();
      } else {
        setCurrentIndex(i => (i + 1) % urls.length);
      }
    };

    videoElement.addEventListener('canplay', handleCanPlay);
    videoElement.addEventListener('ended', handleEnded);

    videoElement.src = urls[0];
    videoElement.load();

    return () => {
      videoElement.removeEventListener('canplay', handleCanPlay);
      videoElement.removeEventListener('ended', handleEnded);
      videoElement.pause();
      texture.dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Swap source when index advances
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const video = videoElementRef.current;
    if (!video || !urls[currentIndex]) return;
    video.pause();
    video.src = urls[currentIndex];
    video.load();
    // canplay handler calls play()
  }, [currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Animate placeholder out on first load
  useEffect(() => {
    if (!videoLoaded || !meshRef.current || !placeholderRef.current) return;

    gsap.from(meshRef.current.scale, {
      duration: 1,
      x: 0.0001,
      y: 0.0001,
      z: 0.0001,
      ease: 'back.out',
    });

    gsap.to(placeholderRef.current.scale, {
      duration: 1,
      x: 0.0001,
      y: 0.0001,
      z: 0.0001,
      ease: 'back.in',
    });
  }, [videoLoaded]);

  return (
    <group>
      <mesh ref={placeholderRef} scale={[0.9, 0.9, 0.9]}>
        <tetrahedronGeometry args={[size, 0]} />
        <meshBasicMaterial color={placeholderColor} flatShading />
      </mesh>

      {videoTexture && (
        <mesh ref={meshRef}>
          <tetrahedronGeometry args={[size, 0]} />
          <meshBasicMaterial map={videoTexture} color={0xffffff} />
        </mesh>
      )}
    </group>
  );
}
