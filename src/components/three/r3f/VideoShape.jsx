import { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import tinycolor from 'tinycolor2';

// The base tumble, before a placement's own multiplier. The shapes turn against
// the backdrop, which turns the other way with the scroll.
const TUMBLE = [-0.001, -0.0008, 0.0009];

/**
 * One video, several shapes.
 *
 * There is a single video element and a single VideoTexture no matter how many
 * placements are passed: every mesh samples the same texture, so the shapes are
 * showing the same frame by construction rather than by being kept in step.
 * Playback -- the cycle through `urls`, the swap on `ended` -- belongs to this
 * component; where the shapes stand and how large they are is measured against
 * the camera's frame by the scene and arrives here as `placements`.
 */
export default function VideoShape({ urls = [], placements = [] }) {
  const groupRefs = useRef([]);
  const meshRefs = useRef([]);
  const placeholderRefs = useRef([]);
  const videoElementRef = useRef(null);
  const [videoTexture, setVideoTexture] = useState(null);
  const [videoLoaded, setVideoLoaded] = useState(false);

  // Keyed by the url list, so the cycle's position and the list it indexes into
  // can never be a render out of step with each other.
  const urlKey = urls.join('|');
  const [cycle, setCycle] = useState({ key: urlKey, index: 0 });
  if (cycle.key !== urlKey) setCycle({ key: urlKey, index: 0 });
  const currentIndex = cycle.key === urlKey ? cycle.index : 0;
  const setCurrentIndex = next =>
    setCycle(c => ({ key: c.key, index: typeof next === 'function' ? next(c.index) : next }));

  // One colour per shape, so the placeholders read as three objects rather than
  // one object drawn three times.
  const placeholderColors = useMemo(
    () => placements.map(() => tinycolor.random().toHexString()),
    [placements.length], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // The urls the shape is playing change when another case study opens, but the
  // element and its texture are built once and kept: tearing them down would
  // drop the material's map for a frame and flash the placeholder back in.
  const urlsRef = useRef(urls);
  urlsRef.current = urls;

  // Create the video element and texture once on mount
  useEffect(() => {
    const videoElement = document.createElement('video');
    videoElement.muted = true;
    videoElement.setAttribute('playsinline', '');
    videoElement.setAttribute('crossorigin', 'anonymous');
    videoElementRef.current = videoElement;

    const texture = new THREE.VideoTexture(videoElement);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBAFormat;

    // play() rejects when a new source interrupts it -- every project switch --
    // and when the browser refuses autoplay outright, as iOS does in Low Power
    // Mode. Neither is worth an unhandled rejection: the shape keeps showing
    // whatever frame it has, which is all a texture can do anyway.
    const play = () => videoElement.play().catch(() => {});

    const handleCanPlay = () => {
      play();
      setVideoTexture(texture);
      setVideoLoaded(true);
    };

    // Read through the ref rather than the mount-time list, so a shape that
    // outlives one project cycles the videos it is showing now.
    const handleEnded = () => {
      const list = urlsRef.current;
      if (list.length <= 1) {
        play();
      } else {
        setCurrentIndex(i => (i + 1) % list.length);
      }
    };

    videoElement.addEventListener('canplay', handleCanPlay);
    videoElement.addEventListener('ended', handleEnded);

    return () => {
      videoElement.removeEventListener('canplay', handleCanPlay);
      videoElement.removeEventListener('ended', handleEnded);
      videoElement.pause();
      videoElement.removeAttribute('src');
      videoElement.load();
      texture.dispose();
    };
  }, []);

  // The one place a source is assigned: on mount, on every step of the cycle,
  // and whenever the project changes under the shapes.
  const currentURL = urls[currentIndex];
  useEffect(() => {
    const video = videoElementRef.current;
    if (!video || !currentURL) return;
    video.pause();
    video.src = currentURL;
    video.load();
    // canplay handler calls play()
  }, [currentURL]);

  // Each shape turns at its own rate, so three of the same solid showing the
  // same frame never line up into one rigid object.
  useFrame(() => {
    groupRefs.current.forEach((group, i) => {
      if (!group) return;
      const spin = placements[i]?.spin ?? 1;
      group.rotation.x += TUMBLE[0] * spin;
      group.rotation.y += TUMBLE[1] * spin;
      group.rotation.z += TUMBLE[2] * spin;
    });
  });

  // Animate placeholders out on first load -- once, and only once. This used
  // to re-run whenever `placements` changed, and placements are rebuilt on
  // every resize: each rebuild restarted a gsap.from() that scales the mesh
  // from nothing, so dragging a window edge kept snapping the shape back to
  // invisible, and a drag that ended mid-tween killed it there and left the
  // shape gone for good.
  //
  // The shapes arrive in turn rather than together: identical eases firing on
  // one frame read as a single event, which loses the depth the placements
  // are there to build.
  const revealed = useRef(false);
  useEffect(() => {
    if (!videoLoaded || revealed.current) return undefined;
    revealed.current = true;

    const tweens = [];
    placements.forEach((placement, i) => {
      const mesh = meshRefs.current[i];
      const placeholder = placeholderRefs.current[i];
      if (!mesh || !placeholder) return;

      const delay = i * 0.12;
      tweens.push(
        gsap.from(mesh.scale, {
          duration: 1,
          delay,
          x: 0.0001,
          y: 0.0001,
          z: 0.0001,
          ease: 'back.out',
        }),
        gsap.to(placeholder.scale, {
          duration: 1,
          delay,
          x: 0.0001,
          y: 0.0001,
          z: 0.0001,
          ease: 'back.in',
        }),
      );
    });

    // Killed only when the component goes away, not when a resize rebuilds
    // the placements, so a tween that is interrupted leaves the scale where
    // the tween had got to rather than at nothing.
    return () => tweens.forEach(tween => tween.kill());
  }, [videoLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {placements.map((placement, i) => (
        <group
          key={placement.id}
          ref={el => { groupRefs.current[i] = el; }}
          position={placement.position}
        >
          <mesh
            ref={el => { placeholderRefs.current[i] = el; }}
            scale={[0.9, 0.9, 0.9]}
          >
            <tetrahedronGeometry args={[placement.size, 0]} />
            <meshBasicMaterial color={placeholderColors[i]} flatShading />
          </mesh>

          {videoTexture && (
            <mesh ref={el => { meshRefs.current[i] = el; }}>
              <tetrahedronGeometry args={[placement.size, 0]} />
              <meshBasicMaterial map={videoTexture} color={0xffffff} />
            </mesh>
          )}
        </group>
      ))}
    </>
  );
}
