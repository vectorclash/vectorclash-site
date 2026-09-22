import { useRef, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import gsap from 'gsap';
import tinycolor from 'tinycolor2';
import ProjectShape from './ProjectShape';
import VideoShape from './VideoShape';
import { latchedSettings } from '../../utils/qualityLevel';
import useQuality from '../../utils/useQuality';
import useRenderWhenVisible from '../../utils/useRenderWhenVisible';
import QualityGovernor from './QualityGovernor';

// Grain is the one thing in this scene the quality level can take away, so it
// goes the same way the star fields do: it fades rather than vanishing. The
// opacity prop is pulled out of the effect's constructor arguments by the
// library and applied as a live uniform, so tweening it here neither rebuilds
// the pass nor recompiles anything.
const GRAIN_FADE = 0.8;

// The framing is authored here rather than inherited from the canvas.
//
// ProjectShape is a 300 unit box turned inside out, and the camera sits just
// outside its near face, so the far wall is 310 units away -- which is why a 50
// degree vertical fov used to put the whole of that wall inside the frame. It
// read as an enveloping form anyway only because the canvas was as tall as the
// section and the viewport ever showed a crop of it. Once the canvas is one
// viewport tall the frame has to do that cropping itself, or the whole scene
// arrives at roughly half the size it used to.
const CAMERA_Z = 160;
const FAR_WALL = CAMERA_Z + 150;

// How much of the far wall stays in view: a little over half the box, which is
// about what a screen used to show of it.
const FRAME_HEIGHT = 165;

// How far the portrait correction below is allowed to go. Fitting the frame to
// the viewport's width means dividing by its aspect, and a phone's aspect is
// small enough to divide by that the frame outgrows the backdrop: at 19.5:9 it
// asked for 358 units of a box that is only 300 across, so the top and bottom
// of the shot fell past the wall's edges into open fog. That empty band above
// and below the scene is what the correction was costing.
const ASPECT_FLOOR = 0.72;

// And a hard ceiling under the box's own 300, for any aspect stranger than the
// floor anticipates. The scene is inside the box, so the frame has to stay
// inside it too.
const MAX_FRAME_HEIGHT = 240;

// How far the scene hangs past the top and bottom of the viewport. Enough to
// clear iOS's status bar and its toolbar, which are the two the scene was
// stopping at; on a browser with no overlaid chrome it is simply overdraw at
// the edges of a scene that is a backdrop anyway.
const SCENE_BLEED = 120;

// A quarter turn over the length of the section. The backdrop is a box, so 90
// degrees is its whole symmetry -- the study ends on a composition equivalent
// to the one it opened with rather than part way through a face.
const SCROLL_ROTATION = Math.PI / 2;

const DEG = 180 / Math.PI;

/**
 * Holds FRAME_HEIGHT of the far wall in view at any viewport, and hands back
 * the metrics that let the rest of the scene place things against the frame's
 * edges rather than at world positions that only suit one shape of screen.
 */
function useFramedCamera() {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  // The canvas is taller than the screen by SCENE_BLEED at each end, so the
  // window that is actually looked at is the middle of it. Everything about
  // the composition -- how much of the wall is held, where the shapes hang --
  // is measured against that window rather than against the whole canvas,
  // which would frame the shot for two bands of it nobody sees.
  const visibleHeight = Math.max(1, size.height - SCENE_BLEED * 2);
  const aspect = size.width / visibleHeight;

  const tanHalfV = useMemo(() => {
    const vertical = Math.tan(Math.atan(FRAME_HEIGHT / 2 / FAR_WALL));
    // A portrait viewport keeping the full height would show barely a hundred
    // units across, which is a different composition rather than the same one
    // on a narrower screen. Below square the frame is fitted to its width --
    // but only down to ASPECT_FLOOR, past which the fit costs more than it
    // buys and the frame starts to overrun the backdrop.
    const fitted = aspect >= 1 ? vertical : vertical / Math.max(aspect, ASPECT_FLOOR);
    return Math.min(fitted, MAX_FRAME_HEIGHT / 2 / FAR_WALL);
  }, [aspect]);

  useLayoutEffect(() => {
    // The lens has to cover the whole canvas, bleed included, while the frame
    // above describes only the visible middle -- so it opens by the ratio
    // between them.
    const overdraw = size.height / visibleHeight;
    camera.fov = 2 * Math.atan(tanHalfV * overdraw) * DEG;
    camera.updateProjectionMatrix();
  }, [camera, tanHalfV, size.height, visibleHeight]);

  return { tanHalfV, aspect };
}

function FilmGrain({ opacity }) {
  const ref = useRef();

  useEffect(() => {
    const blend = ref.current?.blendMode;
    if (!blend) return undefined;

    const tween = gsap.to(blend.opacity, {
      value: opacity,
      duration: GRAIN_FADE,
      ease: 'quad.inOut',
    });

    return () => tween.kill();
  }, [opacity]);

  // Mounted at zero and tweened up, so the grain arrives rather than appearing.
  return <Noise ref={ref} blendFunction={BlendFunction.SCREEN} opacity={0} />;
}

/**
 * True while `on` is true, and for `ms` afterwards.
 *
 * The composer itself has to outlive the fade. Unmounting it the moment the
 * grain is switched off would cut the fade short and take a whole render pass
 * out from under the scene in the same frame, which is a visible flash --
 * the composer draws through its own target, so losing it changes how the
 * frame is composited, not just what is in it.
 */
function useLingering(on, ms) {
  const [lingering, setLingering] = useState(on);

  useEffect(() => {
    if (on) {
      setLingering(true);
      return undefined;
    }

    const timer = setTimeout(() => setLingering(false), ms);
    return () => clearTimeout(timer);
  }, [on, ms]);

  return on || lingering;
}

// Where the video shape stands, and how big it is.
//
// One shape, close to the camera. Three of them at three depths gave the shot
// more objects than it had room to compose: the backdrop is already turning
// with the scroll and tumbling on its own, and the study's text sits over all
// of it, so every extra solid was another thing competing with the reading
// rather than framing it. Near the camera a single shape is large on screen
// while staying small in the world, which is what lets it sit clear of the
// text instead of behind it -- and the parallax against a backdrop 300 units
// away does the work the other two depths were there to do.
//
// `depth` is a world z, inside the 300 unit backdrop box. `radius` is a
// fraction of the visible frame's half height *at that depth*, and `centre` is
// where the shape sits, in fractions of that frame's half extents -- so the
// composition keeps its proportions at any aspect rather than its pixels.
//
// The centre is stated outright rather than as a share of the room left over
// after the radius, which is how it used to be given. That older form kept
// every shape whole, but it also meant size and position fought each other:
// growing the shape ate the room it had to be placed within and dragged it
// back to the middle. A foreground object this large has to be free to cross
// the frame's edge -- it hangs off the left and the bottom, which is what
// reads as something near the camera rather than a small solid in a gap.
const VIDEO_PLACEMENTS = [
  {
    id: 'near',
    depth: 96,
    radius: 1.05,
    narrowRadius: 0.78,
    // The same positions the smaller shape held, now stated directly: out in
    // the margin beside the study's column on a wide screen, and low on a
    // phone, where the column runs the full width and nothing can clear it.
    centre: [-0.54, -0.22],
    narrowCentre: [-0.3, -0.41],
    spin: 1.25,
  },
];

// A ceiling on how much of the frame's width the shape may take. It was set
// under 1 to keep the shape inside the frame on a phone, which is no longer
// what is wanted -- the shape crosses the edge everywhere else, and holding it
// back only on the screen with the least room made it smallest exactly where
// it needed to carry most. Past 1 now, so it still cannot swallow a narrow
// viewport whole but may run off both sides. High enough now that the radius
// is what decides the size on every screen and this is only the safety net.
//
// Worth knowing when tuning either number: a tetrahedron's faces sit a third
// of its radius from the centre, so most of the time its silhouette is far
// smaller than the radius suggests. Values that look reckless written down
// read as generous on screen.
const VIDEO_WIDTH_GUARD = 1.6;

function Scene({ textureURL, videoURLs, fogColor, imageURLs }) {
  const projectGroupRef = useRef();
  const scrollGroupRef = useRef();
  // Narrow selectors so a canvas resize doesn't re-render the whole scene.
  const gl = useThree((state) => state.gl);
  const frame = useFramedCamera();

  // Both the size and the position are read off the frame at the shape's own
  // depth, so the composition is the same one on any screen. Nothing here
  // keeps the shape inside the frame: at this size it is meant to run past the
  // edge.
  const videoPlacements = useMemo(
    () =>
      VIDEO_PLACEMENTS.map(({ id, depth, radius, narrowRadius, centre, narrowCentre, spin }) => {
        const halfHeight = (CAMERA_Z - depth) * frame.tanHalfV;
        const halfWidth = halfHeight * frame.aspect;

        const narrow = frame.aspect < 1;
        const size = Math.min(
          halfHeight * (narrow ? narrowRadius : radius),
          halfWidth * VIDEO_WIDTH_GUARD,
        );

        const at = narrow ? narrowCentre : centre;

        return { id, size, spin, position: [halfWidth * at[0], halfHeight * at[1], depth] };
      }),
    [frame.tanHalfV, frame.aspect],
  );

  const { settings } = useQuality();
  const grainOn = settings.grain > 0;
  const composerMounted = useLingering(grainOn, GRAIN_FADE * 1000 + 100);

  useEffect(() => {
    // The container is the box the sticky canvas is free to travel through,
    // so its bounds are also the range the scroll link is measured against.
    const range = gl.domElement.closest('.project-three-container');
    if (!range) return undefined;

    let rotationTween = null;

    const turnTo = (progress, immediate) => {
      const group = scrollGroupRef.current;
      if (!group) return;

      if (rotationTween) rotationTween.kill();

      // A re-measure is not a scroll. Opening a study grows this section from
      // a collapsed panel to several screens, and every intermediate height is
      // a range the page's current scroll position sits at some meaningless
      // point of -- most of them at the very end, because a box barely taller
      // than the window divides a large distance by a small one. Tweening
      // through those readings is what sent the backdrop through its whole
      // quarter turn and back in the moment a project finished loading. Set
      // absolutely instead: the transient values pass by unseen behind a
      // section still at zero opacity, and the one that is true when the
      // panel settles is the one the scene fades up on.
      if (immediate) {
        group.rotation.y = progress * SCROLL_ROTATION;
        return;
      }

      // Turning the backdrop rather than sliding the camera down past it. The
      // camera drift this replaces moved the framing off the shape instead of
      // moving through anything, and a case study is long enough that it spent
      // most of the read parked at the bottom of its range.
      rotationTween = gsap.to(group.rotation, {
        duration: 0.5,
        y: progress * SCROLL_ROTATION,
        ease: 'quad.out',
      });
    };

    const measure = (immediate) => {
      const rect = range.getBoundingClientRect();
      // What the sticky canvas actually has to travel: everything past the one
      // viewport it occupies. A section with none of that is not a range that
      // has been read part of the way through -- it is one standing at its
      // start, so it reads as zero rather than dividing by a floored pixel and
      // landing at the far end.
      const travel = rect.height - window.innerHeight;
      const progress = travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;

      // Measured as progress through the section rather than against a raw
      // scroll distance the way the hero is, because a study can be three
      // screens or six: the quarter turn has to spread over whichever it is.
      turnTo(progress, immediate);
    };

    // Set the scene against wherever the page already is, without animating
    // there. The section is mid-expansion at this point on the first project
    // opened, so this reading is one of the transient ones.
    measure(true);

    const handleScroll = () => measure(false);
    window.addEventListener('scroll', handleScroll);

    // The section is several screens taller once a study is open and several
    // screens shorter again when it closes, and neither change is a scroll --
    // so the range is watched as well as listened to, or the link keeps
    // dividing by whichever height it last happened to see.
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => measure(true));
    if (observer) observer.observe(range);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (observer) observer.disconnect();
      if (rotationTween) rotationTween.kill();
    };
  }, [gl]);

  useFrame(() => {
    if (projectGroupRef.current) {
      projectGroupRef.current.rotation.x += 0.001;
      projectGroupRef.current.rotation.y += 0.0008;
      projectGroupRef.current.rotation.z -= 0.0009;
    }
  });

  return (
    <>
      <fog attach="fog" args={[fogColor, 1, 1400]} />
      <ambientLight intensity={1.5} color={0xfafafa} />
      <directionalLight intensity={1} color={0x00ccff} />

      {/*
        No Suspense boundary here on purpose. ProjectShape loads its textures
        itself precisely so that it does not suspend: a boundary would take the
        shape off screen for the length of a project's first load and put it
        back afterwards, which is the two-part transition this scene used to
        have.
      */}
      {/*
        Two groups, because the idle tumble in useFrame adds to its rotation
        every frame while the scroll link sets one absolutely. On a single group
        they would overwrite each other frame by frame; nested, they compose.
      */}
      <group ref={scrollGroupRef}>
        <group ref={projectGroupRef}>
          {textureURL && imageURLs.length > 0 && (
            <ProjectShape key="project-shape" size={300} textureURL={textureURL} imageURLs={imageURLs} />
          )}
        </group>
      </group>

      {videoURLs && videoURLs.length > 0 && (
        <VideoShape urls={videoURLs} placements={videoPlacements} />
      )}

      <QualityGovernor />

      {composerMounted && (
        <EffectComposer multisampling={latchedSettings().multisampling}>
          <FilmGrain opacity={grainOn ? settings.grain : 0} />
        </EffectComposer>
      )}
    </>
  );
}

export default function ProjectsScene({ textureURL, videoURLs, imageURLs = [] }) {
  // This canvas is mounted for the life of the page and merely faded to zero
  // opacity when no project is open, so on-screen alone is not enough to decide
  // whether it is worth drawing. A null textureURL is the existing signal that
  // nothing is being shown.
  const [canvasRef, frameloop] = useRenderWhenVisible(Boolean(textureURL || videoURLs));
  const [fogColor, setFogColor] = useState('#fb0097');

  // The hue is the scene's alone. It used to be set as the canvas element's CSS
  // background as well, which was paint that could never be seen -- the context
  // is created with alpha: false, so the drawing buffer is opaque and whatever
  // sits behind it is covered. What it did reach was Safari, which colours its
  // toolbars from the page's own background and so jumped to a different hue
  // with every project opened. Nothing outside the canvas carries this colour
  // now, so the studies can be as various as they like without the browser's
  // chrome following them.
  useEffect(() => {
    if (!textureURL) return;
    setFogColor(tinycolor('#CCFF00').spin(Math.random() * 360).toHexString());
  }, [textureURL]);

  return (
    <Canvas
      ref={canvasRef}
      frameloop={frameloop}
      // Starting value only; QualityGovernor drives it from here.
      dpr={Math.min(latchedSettings().dpr, window.devicePixelRatio || 1)}
      // fov is a starting value only, so the first frame is not drawn at
      // three's default before useFramedCamera has derived the real one.
      camera={{ position: [0, 2, CAMERA_Z], fov: 30, near: 0.1, far: 20000 }}
      gl={{
        // Only consulted at the bottom level, where the composer is unmounted
        // and the scene draws straight to the backbuffer. Everywhere else the
        // composer's own multisampling is what counts.
        antialias: latchedSettings().multisampling > 0,
        // No precision override. It used to drop to mediump below the top tier,
        // which is a blunt instrument -- it lowers the default precision for
        // every fragment shader in the scene at once, and this hero already has
        // a documented precision-sensitive dither in it. The saving was never
        // measured and the failure mode is banding, so three's highp default
        // stands.
        alpha: false, // Disable alpha for better performance
        physicallyCorrectLights: false, // Disable for better performance
        powerPreference: 'high-performance', // Request high-performance GPU
      }}
      // Sticky rather than filling its container, which is the whole section.
      // A case study is several screens, and a backdrop anchored to the top of
      // one would be gone by the second plate -- so the scene travels with the
      // read instead, pinned to the viewport until the section runs out from
      // under it. It also bounds the drawing buffer: r3f sizes the renderer
      // from this box, so a section thousands of pixels tall no longer means a
      // canvas thousands of pixels tall.
      // Sticky, and pinned past both edges of the screen rather than at them.
      // Safari holds fixed and sticky elements inside the area its own chrome
      // does not cover, so a scene pinned at top: 0 stops at the status bar and
      // again at the toolbar, while the study's text -- ordinary flow content
      // -- scrolls the full height and passes under both. The scene read as
      // boxed in between them. Overhanging the viewport by SCENE_BLEED at each
      // end puts the canvas under the chrome whatever rect the pinning is
      // measured against, so this does not depend on which inset is at work.
      style={{
        position: 'sticky',
        top: `${-SCENE_BLEED}px`,
        height: `calc(100vh + ${SCENE_BLEED * 2}px)`,
      }}
    >
      <Scene
        textureURL={textureURL}
        videoURLs={videoURLs}
        fogColor={fogColor}
        imageURLs={imageURLs}
      />
    </Canvas>
  );
}
