import { useState, useEffect, useLayoutEffect, useRef, memo, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import gsap from "gsap/all";
// Shares the async three/r3f chunk with HeroScene, so by the time a project
// is opened this is almost always already resolved.
const ProjectsScene = lazy(() => import("./three/r3f/ProjectsScene"));
import GradientGenerator from "./utils/GradientGenerator";
import HexagonLoader from "./HexagonLoader";
import "./ProjectGrid.scss";
import tinycolor from "tinycolor2";

import left from "..//images/angle-left.svg";
import right from "../images/angle-right.svg";
import close from "../images/window-close.svg";
import me from "../images/me.png";

// Grid tiles render at roughly 390x220 and a paired plate at around 590 wide,
// so both were being handed 1920x1080 sources -- around 2MB of decode work for
// the seven tiles alone. The 800px derivatives sit next to each original; the
// lightbox, the 3D shape and a plate standing on its own still use the
// full-size file.
const thumbURL = (url) => url.replace(/\.jpg$/, "_thumb.jpg");

// A case study reads as a run of prose and plates rather than as a column of
// text beside a gallery, so the panel renders from a flattened list of blocks
// instead of from the fields directly. `figures` indexes into `images`, which
// stays a plain list of URLs -- the 3D shape, the grid tile and the lightbox
// all still address an image by its position in it.
const leadImage = (project) => {
  const blocks = buildCaseBlocks(project);
  const plate = blocks.find((block) => block.type === "plate");
  return project.images[plate ? plate.figures[0] : 0];
};

const buildCaseBlocks = (project) => {
  const blocks = [];
  const claimed = new Set();
  let prose = 0;

  const sections =
    project.sections && project.sections.length > 0
      ? project.sections
      : [{ body: project.body, figures: [] }];

  sections.forEach((section, i) => {
    blocks.push({
      type: "prose",
      key: `prose-${i}`,
      heading: section.heading,
      body: section.body,
      // Alternating the measure from side to side is what gives the flow its
      // rhythm: a plate between two sections always has a different edge to
      // sit against.
      offset: prose++ % 2 === 1,
    });

    const figures = (section.figures || []).filter(
      (n) => Number.isInteger(n) && n >= 0 && n < project.images.length
    );
    figures.forEach((n) => claimed.add(n));
    if (figures.length > 0) {
      blocks.push({
        type: "plate",
        key: `plate-${i}`,
        figures,
        // The one plate that is on screen when the panel opens, and so the one
        // image of the study worth fetching eagerly.
        lead: !blocks.some((b) => b.type === "plate"),
      });
    }
  });

  // Nothing in the data gets to drop an image silently. Anything no section
  // claimed -- including every image of a project written before `sections`
  // existed -- closes the study out rather than going unseen.
  const rest = project.images
    .map((_, n) => n)
    .filter((n) => !claimed.has(n));
  if (rest.length > 0) {
    blocks.push({ type: "plate", key: "plate-rest", figures: rest });
  }

  return blocks;
};

// How far down the flow the cold-open entrance reaches. A study runs to several
// screens and the blocks past this point are below the fold when it plays, so
// staggering them too would only stretch the tail of the timeline.
const ENTRANCE_BLOCKS = 4;

// The height of the panel that is actually on screen. Both the expansion and
// the swap tween a height, and now that the panel can be five screens tall,
// tweening to the full one spends nearly all of its duration moving content
// nobody can see -- and moves the part they can see several times too fast.
const visibleHeight = (el) =>
  Math.max(0, window.innerHeight - el.getBoundingClientRect().top);

// The same three controls open and close the study. They are a component
// rather than markup repeated twice because a study is now long enough to need
// them at both ends, and two copies that could drift apart is how the one at
// the bottom ends up doing something the one at the top does not.
function ProjectControls({ onPrev, onClose, onNext }) {
  return (
    <div className="project-controls">
      <button
        type="button"
        className="prev-button"
        onClick={onPrev}
        title="Previous Case Study"
        aria-label="Previous Case Study"
      >
        <img src={left} alt="" />
      </button>
      <button
        type="button"
        className="close-button"
        onClick={onClose}
        title="Close"
        aria-label="Close Case Study"
      >
        <img src={close} alt="" />
      </button>
      <button
        type="button"
        className="next-button"
        onClick={onNext}
        title="Next Case Study"
        aria-label="Next Case Study"
      >
        <img src={right} alt="" />
      </button>
    </div>
  );
}

function GradientFiller() {
  const layerARef = useRef(null);
  const layerBRef = useRef(null);
  const containerRef = useRef(null);
  const meRef = useRef(null);

  const generateGradient = () => {
    const colors = new GradientGenerator(2, true).colors;
    return `linear-gradient(42deg, ${colors[0].toHexString()}, ${colors[1].toHexString()})`;
  };

  useEffect(() => {
    layerARef.current.style.backgroundImage = generateGradient();

    let timeoutId;

    const transition = () => {
      if (!layerARef.current || !layerBRef.current) return;

      const next = generateGradient();
      layerBRef.current.style.backgroundImage = next;
      gsap.to(layerBRef.current, {
        opacity: 1,
        duration: 3.5,
        ease: 'power2.inOut',
        onComplete: () => {
          // A project opening mid-fade unmounts the filler while this tween is
          // still running, and the callback then reached for a detached node.
          if (!layerARef.current || !layerBRef.current) return;
          layerARef.current.style.backgroundImage = next;
          gsap.set(layerBRef.current, { opacity: 0 });
          scheduleNext();
        }
      });
    };

    const scheduleNext = () => {
      timeoutId = setTimeout(transition, 5000 + Math.random() * 10000);
    };

    scheduleNext();

    const animateMe = () => {
      const container = containerRef.current;
      const img = meRef.current;
      if (!container || !img) return;
      gsap.to(img, {
        duration: 5 + Math.random() * 10,
        x: Math.random() * (container.clientWidth - 30),
        y: Math.random() * (container.clientHeight - 30),
        alpha: Math.random() * 0.4,
        ease: "quad.inOut",
        onComplete: animateMe,
      });
    };

    animateMe();

    return () => {
      clearTimeout(timeoutId);
      if (meRef.current) gsap.killTweensOf(meRef.current);
      if (layerBRef.current) gsap.killTweensOf(layerBRef.current);
    };
  }, []);

  return (
    <li className="grid-filler" aria-hidden="true" ref={containerRef}>
      <div ref={layerARef} className="filler-layer" />
      <div ref={layerBRef} className="filler-layer filler-layer--top" />
      <img ref={meRef} src={me} className="filler-me" alt="" />
    </li>
  );
}

function ProjectGrid({ projects, threeContainerRef, onProjectActiveChange }) {
  const [isProjectActive, setIsProjectActive] = useState(false);
  const [activeProjectID, setActiveProjectID] = useState(null);
  const [currentTexture, setCurrentTexture] = useState(null);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [currentImageURLs, setCurrentImageURLs] = useState([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [previousImageIndex, setPreviousImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState('forward');
  const [isProjectTransitioning, setIsProjectTransitioning] = useState(false);
  const [activeThumbnailID, setActiveThumbnailID] = useState(null);
  const [isProjectLoading, setIsProjectLoading] = useState(false);
  // The loader outlives the loading state by the length of its fade: it is
  // still on screen, on its way out, while the panel is expanding underneath.
  const [isLoaderMounted, setIsLoaderMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const mountRef = useRef(null);
  const r3fRootRef = useRef(null);
  const projectLoadTimeoutRef = useRef(null);
  const closeTimelineRef = useRef(null);
  const openTimelineRef = useRef(null);
  const returningToGridRef = useRef(false);
  // Set by prev/next on the way out and read back by the layout effect once the
  // new project has been committed, which is what tells the effect to run the
  // swap entrance instead of the cold open.
  const swapRef = useRef(null);
  const swapTimelineRef = useRef(null);
  // Where the page stood when the grid was left. Closing a study several
  // screens tall from the bottom of it would otherwise hand back a page that is
  // suddenly one screen long, and the browser clamps the scroll to wherever
  // that leaves it -- usually past the section entirely.
  const gridScrollRef = useRef(0);

  const killOpenTimeline = () => {
    if (openTimelineRef.current) {
      openTimelineRef.current.kill();
      openTimelineRef.current = null;
    }
  };

  const killSwapTimeline = () => {
    if (swapTimelineRef.current) {
      swapTimelineRef.current.kill();
      swapTimelineRef.current = null;
    }
    swapRef.current = null;
  };

  // The pieces a project swap carries across: everything that is actually a
  // different project afterwards. The controls are deliberately left out --
  // they are the frame around the content, and blinking them out and back is
  // what made the panel look like it was closing and reopening.
  const swapPieces = (detail) =>
    [
      detail.querySelector(".project-header h2"),
      detail.querySelector(".project-header .tools"),
      ...detail.querySelectorAll(".case-block"),
    ].filter(Boolean);

  // The parent dims the section while a project is open. It is told the project
  // has closed as soon as the exit animation starts, so the backdrop cross-fades
  // underneath the outgoing panel instead of after it.
  const isProjectVisuallyOpen = isProjectActive && !isClosing;

  // Initialize Three.js scene
  useEffect(() => {
    if (!threeContainerRef.current) return;

    r3fRootRef.current = createRoot(threeContainerRef.current);
    renderThreeScene();

    return () => {
      if (r3fRootRef.current) {
        r3fRootRef.current.unmount();
      }
    };
  }, [threeContainerRef]);

  // Disarm a tapped tile when the next tap lands outside the grid. This has to
  // live in its own effect keyed on activeThumbnailID: bound once alongside the
  // r3f root it captured the initial null and the guard could never pass, so on
  // touch an armed tile stayed armed no matter where you tapped next.
  useEffect(() => {
    if (activeThumbnailID === null) return;

    const handleDocumentClick = (e) => {
      if (mountRef.current && !mountRef.current.contains(e.target)) {
        setActiveThumbnailID(null);
      }
    };

    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, [activeThumbnailID]);

  // Update Three.js scene when texture or video changes
  useEffect(() => {
    renderThreeScene();
  }, [currentTexture, currentVideo, currentImageURLs]);

  // Notify parent component when project active state changes
  useEffect(() => {
    if (onProjectActiveChange) {
      onProjectActiveChange(isProjectVisuallyOpen);
    }
  }, [isProjectVisuallyOpen, onProjectActiveChange]);

  useEffect(() => {
    return () => {
      if (closeTimelineRef.current) {
        closeTimelineRef.current.kill();
        closeTimelineRef.current = null;
      }
      killOpenTimeline();
      killSwapTimeline();
    };
  }, []);

  // Handle project activation and deactivation. This runs as a layout effect so
  // that the canvas is hidden in the same frame the grid is painted back in;
  // as a passive effect the browser could paint the grid over a still-visible
  // scene for a frame.
  useLayoutEffect(() => {
    if (!mountRef.current) return;

    const projectContent = mountRef.current.querySelector(".project-content");

    if (isProjectActive && activeProjectID !== null) {
      const project = projects[activeProjectID];

      if (!project || !project.images || project.images.length === 0) {
        return;
      }

      // Set up project data
      let newVideo = null;
      if (project.videos && project.videos.length > 0) {
        newVideo = project.videos;
      }

      const newImageURLs = project.images;
      const newTexture = newImageURLs[0];
      const newColor = tinycolor("#CCFF00").spin(Math.random() * 360);

      setCurrentImageURLs(newImageURLs);
      setCurrentTexture(newTexture);
      setCurrentVideo(newVideo);
      setActiveImageIndex(0);

      const headerElement = mountRef.current.querySelector(".project-header");
      const newBorderColor = newColor.setAlpha(0.4).toRgbString();

      // Arriving from prev/next: the panel is already open and pinned at the
      // outgoing project's height, so there is nothing to load into and no
      // loader to run. Hand off to the swap entrance before any of the cold
      // open's setup, all of which would undo the pin.
      const swap = swapRef.current;
      if (swap) {
        swapRef.current = null;
        runSwapEntrance(swap, newBorderColor);
        return;
      }

      // Show loader
      setIsProjectLoading(true);
      setIsLoaderMounted(true);

      // The panel does not unmount between prev/next, so an expansion or a
      // loader fade interrupted by the swap would otherwise leave its inline
      // height and opacity behind on the elements this pass reuses.
      gsap.set(mountRef.current, { clearProps: "height,overflow" });
      const staleLoader = mountRef.current.querySelector(".project-loader");
      if (staleLoader) {
        gsap.killTweensOf(staleLoader);
        gsap.set(staleLoader, { clearProps: "opacity,top" });
      }

      // Update header color
      if (headerElement) {
        headerElement.style.borderBottomColor = newBorderColor;
      }

      // Hide Three.js container initially
      if (threeContainerRef.current) {
        gsap.set(threeContainerRef.current, { alpha: 0 });
      }

      // Sequence: hold the loader over the collapsed panel → expand the panel
      // to its measured height while the loader fades and the content rises
      // in → bring the scene up once the height has settled. The whole
      // entrance is one timeline held in a ref so that closing part
      // way through can kill it outright. As separate delayed tweens it kept
      // writing opacity and y on the same elements as the exit animation, and
      // the two fought each other frame by frame.
      if (projectLoadTimeoutRef.current) {
        clearTimeout(projectLoadTimeoutRef.current);
      }
      projectLoadTimeoutRef.current = setTimeout(() => {
        const detail = mountRef.current;
        if (!detail) return;

        // Expanding the panel means tweening between two real heights, so both
        // have to be measured in this one callback: the collapsed box as it
        // stands, then the full layout. flushSync is what makes the second
        // measurement possible -- a plain setState would not reach the DOM
        // until after this callback returns. The fromTo below sets the
        // collapsed height back on the same tick, so the expanded state is
        // never painted.
        const collapsedHeight = detail.offsetHeight;
        const loader = detail.querySelector(".project-loader");

        flushSync(() => setIsProjectLoading(false));

        const expandedHeight = detail.offsetHeight;

        // The tween stops at the bottom of the viewport and clearProps hands
        // the real height back at the end, where the rest of the study is off
        // screen and the difference cannot be seen.
        const openTarget = Math.min(
          expandedHeight,
          Math.max(collapsedHeight, visibleHeight(detail))
        );

        // The scene canvas used to be sized from a section that grows for the
        // length of this expansion, so it resized every frame of it -- and with
        // the postprocessing composer mounted, reallocated its render targets
        // every frame too. That is what arrived half drawn and snapped into
        // place at the end, and it needed the canvas pinned to the height the
        // section was about to have. A sticky scene is a viewport tall whatever
        // the section does, so there is nothing left to pin.

        // The loader is centred on the panel, so left to itself it would ride
        // downwards as the panel grows. Pinning it to where it already is
        // keeps it still while it fades.
        if (loader) {
          gsap.set(loader, { top: collapsedHeight / 2 });
        }

        const header = mountRef.current?.querySelector(".project-header");
        const projectTitle = header?.querySelector("h2");
        const tools = header?.querySelector(".tools");
        const controls = header?.querySelector(".project-controls");
        const entering = Array.from(
          projectContent?.querySelectorAll(".case-block") || []
        ).slice(0, ENTRANCE_BLOCKS);

        killOpenTimeline();

        // Named because the scene fade below is timed off the end of it.
        const EXPAND_DURATION = 0.55;

        const tl = gsap.timeline({
          onComplete: () => {
            openTimelineRef.current = null;
          },
        });
        openTimelineRef.current = tl;

        // Grow the panel to its measured height under the content fading in,
        // clipped while it does so the content cannot spill out of the box on
        // the way up. clearProps hands the height back to the layout at the
        // end, so nothing is pinned to a stale measurement afterwards.
        tl.fromTo(
          detail,
          { height: collapsedHeight, overflow: "hidden" },
          {
            height: openTarget,
            duration: EXPAND_DURATION,
            ease: "power2.inOut",
            clearProps: "height,overflow",
          },
          0
        );

        // Unmounted the moment it finishes fading, not when the timeline does.
        // Held to the end it was an invisible mix-blend-mode element sitting
        // over the section for another second, still running its own loop, and
        // still there when the scene faded up behind it -- a blend group inside
        // an opacity:0 ancestor is exactly where a browser will paint the
        // group's rectangle instead of nothing.
        if (loader) {
          tl.to(
            loader,
            {
              opacity: 0,
              duration: 0.35,
              ease: "power2.in",
              onComplete: () => setIsLoaderMounted(false),
            },
            0
          );
        }

        // Fade in project content container first
        if (projectContent) {
          tl.to(projectContent, { opacity: 1, duration: 0.1, ease: "power2.out" }, 0);
        }

        // Animate header elements
        if (projectTitle) {
          tl.to(projectTitle, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, 0);
        }

        if (tools) {
          tl.to(tools, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, 0.05);
        }

        if (controls) {
          tl.to(controls, { opacity: 0.8, x: 0, duration: 0.5, ease: "power2.out" }, 0.1);
        }

        // Rise the opening run of the flow in, prose and plates alike, in the
        // order they are read. fromTo rather than to: the blocks past
        // ENTRANCE_BLOCKS are never tweened, so nothing may leave them sitting
        // at an opacity the timeline would have to clear.
        if (entering.length > 0) {
          tl.fromTo(
            entering,
            { y: 30, opacity: 0 },
            {
              opacity: 1,
              y: 0,
              duration: 0.5,
              ease: "power2.out",
              stagger: { amount: 0.18 },
            },
            0.1
          );
        }

        // Fade in the Three.js background only once the panel has settled at
        // full height. Even pinned, the canvas is showing a shape centred on
        // the finished section, which during the expansion is still below the
        // fold -- fading it in early would have it creep up out of the growing
        // box rather than arrive in place.
        if (threeContainerRef.current) {
          tl.to(
            threeContainerRef.current,
            {
              alpha: 1,
              duration: 0.6,
              ease: "power2.out",
            },
            EXPAND_DURATION + 0.1
          );
        }

        projectLoadTimeoutRef.current = null;
      }, 1000);
    } else if (!isProjectActive) {
      if (projectLoadTimeoutRef.current) {
        clearTimeout(projectLoadTimeoutRef.current);
        projectLoadTimeoutRef.current = null;
      }

      killOpenTimeline();

      setCurrentTexture(null);
      setCurrentVideo(null);
      setCurrentImageURLs([]);
      setActiveImageIndex(0);
      setIsGalleryOpen(false);
      setIsProjectLoading(false);
      setIsLoaderMounted(false);

      if (threeContainerRef.current) {
        gsap.killTweensOf(threeContainerRef.current);
        gsap.set(threeContainerRef.current, { alpha: 0 });
      }

      // Returning from a project: stagger the tiles back in rather than having
      // the whole grid appear at once where the panel used to be.
      if (returningToGridRef.current) {
        returningToGridRef.current = false;
        // Instantly, not smoothly: the panel has already faded out and the grid
        // is not painted yet, so there is nothing on screen for a scroll to
        // travel across.
        window.scrollTo(0, gridScrollRef.current);
        const tiles = mountRef.current.querySelectorAll("li");
        if (tiles.length > 0) {
          gsap.fromTo(
            tiles,
            { opacity: 0, y: 16 },
            {
              opacity: 1,
              y: 0,
              duration: 0.35,
              ease: "power2.out",
              stagger: { amount: 0.18 },
              clearProps: "opacity,transform",
            }
          );
        }
      }
    }
  }, [isProjectActive, activeProjectID]);

  const renderThreeScene = () => {
    if (!r3fRootRef.current) return;

    r3fRootRef.current.render(
      <Suspense fallback={null}>
        <ProjectsScene
          key="projects-scene"
          textureURL={currentTexture}
          videoURLs={currentVideo}
          imageURLs={currentImageURLs}
        />
      </Suspense>
    );
  };

  const onProjectOver = (_index, e) => {
    const colors = new GradientGenerator(2, true).colors;
    const colorString = `linear-gradient(42deg, ${colors[0].toHexString()}, ${colors[1].toHexString()})`;
    const textColor = (colors[0].isLight() && colors[1].isLight()) ? "#454545" : "white";

    gsap.set(e.currentTarget, { backgroundImage: colorString });
    gsap.set(e.currentTarget.querySelector("h4"), {
      color: textColor,
      borderColor: textColor,
    });
  };

  // Clicking a tile focuses it as well as hovering it, and the focus handler
  // rolling a fresh palette there swapped the tile's colours for the frame
  // before the project opened. Only keyboard focus needs the treatment --
  // a pointer has already had the hover. Older engines without :focus-visible
  // throw on the selector; there the previous behaviour is the safe answer.
  const isKeyboardFocus = (el) => {
    try {
      return el.matches(":focus-visible");
    } catch {
      return true;
    }
  };

  const onProjectClick = (index) => {
    // On mobile/touch devices, use two-tap behavior
    if (window.innerWidth <= 1024) {
      if (activeThumbnailID === index) {
        // Second tap - open the project
        gridScrollRef.current = window.scrollY;
        setIsProjectActive(true);
        setActiveProjectID(index);
        setActiveThumbnailID(null);
      } else {
        // First tap - activate the thumbnail
        setActiveThumbnailID(index);
      }
    } else {
      // Desktop - direct click to open
      gridScrollRef.current = window.scrollY;
      setIsProjectActive(true);
      setActiveProjectID(index);
    }
  };

  // Enter and Space open a project outright. The two-tap arming that touch
  // uses has no keyboard equivalent -- focus already does what the first tap is
  // for -- so this deliberately bypasses it.
  const onProjectKeyDown = (index, e) => {
    if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
    e.preventDefault();
    gridScrollRef.current = window.scrollY;
    setIsProjectActive(true);
    setActiveProjectID(index);
    setActiveThumbnailID(null);
  };

  // Prev/next with the panel already open is a move between two projects, not
  // a close followed by an open. Routing it through the cold-open path is what
  // made it feel broken: the loader branch collapses the panel to its
  // min-height with no animation at all, holds there for a second, then
  // expands again. Here the panel keeps its box the whole way -- the outgoing
  // content leaves in the direction of travel, the height tweens straight from
  // one project's to the other's, and the new content arrives from the far
  // side.
  const SWAP_OUT_DURATION = 0.22;
  const SWAP_IN_DURATION = 0.45;
  // How far the content is allowed to slide, and the ceiling on how long the
  // entrance will wait for the incoming hero image to decode.
  const SWAP_SHIFT = 24;
  const SWAP_DECODE_CAP = 350;

  const startProjectSwap = (direction) => {
    if (isProjectTransitioning || isClosing) return;

    const detail = mountRef.current;
    if (!detail || activeProjectID === null) return;

    const target =
      (activeProjectID + direction + projects.length) % projects.length;

    setIsProjectTransitioning(true);
    killOpenTimeline();
    killSwapTimeline();

    // Started here rather than on arrival so the decode overlaps the exit. By
    // the time the new content fades in the JPEG is usually ready, and the
    // gallery slot is not an empty box for a frame.
    const preload = new Image();
    preload.src = leadImage(projects[target]);

    const pieces = swapPieces(detail);
    gsap.killTweensOf(pieces);

    swapRef.current = { direction, preload };

    // Pinning the height is what holds the panel still while its contents are
    // replaced underneath: React swaps a two-paragraph description for a
    // five-paragraph one the moment the id changes, and nothing should move
    // until the entrance tweens it.
    gsap.set(detail, { height: detail.offsetHeight, overflow: "hidden" });

    const tl = gsap.timeline({
      onComplete: () => {
        swapTimelineRef.current = null;
        setActiveProjectID(target);
      },
    });
    swapTimelineRef.current = tl;

    tl.to(
      pieces,
      {
        opacity: 0,
        x: -SWAP_SHIFT * direction,
        duration: SWAP_OUT_DURATION,
        ease: "power2.in",
        stagger: { amount: 0.06, from: direction > 0 ? "start" : "end" },
      },
      0
    );

    if (threeContainerRef.current) {
      gsap.killTweensOf(threeContainerRef.current);
      tl.to(
        threeContainerRef.current,
        { alpha: 0, duration: SWAP_OUT_DURATION + 0.06, ease: "power2.in" },
        0
      );
    }
  };

  // Runs from the layout effect, with the new project already committed to the
  // DOM at opacity 0 and the panel still pinned at the old height.
  const runSwapEntrance = ({ direction, preload }, borderColor) => {
    const detail = mountRef.current;
    if (!detail) return;

    // Both heights have to be read in this one synchronous pass: the pin as it
    // stands, then the height the new project actually wants. Letting the box
    // go and pinning it straight back costs a layout and no paint, because a
    // layout effect runs before the browser gets the frame.
    const fromHeight = detail.offsetHeight;
    gsap.set(detail, { height: "auto" });
    const toHeight = detail.offsetHeight;
    gsap.set(detail, { height: fromHeight });

    const threeContainer = threeContainerRef.current;

    // Two studies of different lengths are usually both taller than the screen,
    // and tweening between two heights that are each past the fold animates
    // nothing anyone can see. Where that is the case the panel is handed
    // straight back to the layout and only the content cross-fades.
    const cap = visibleHeight(detail);
    const animateHeight = fromHeight < cap || toHeight < cap;
    const heightTarget = Math.min(toHeight, Math.max(cap, fromHeight));

    const start = () => {
      const detail = mountRef.current;
      // A close, or another swap, may have landed while we waited on the
      // decode.
      if (!detail || swapRef.current) return;

      projectLoadTimeoutRef.current = null;

      const header = detail.querySelector(".project-header");
      if (header && borderColor) {
        gsap.to(header, { borderBottomColor: borderColor, duration: SWAP_IN_DURATION });
      }

      const projectContent = detail.querySelector(".project-content");
      const pieces = swapPieces(detail);

      killOpenTimeline();

      const tl = gsap.timeline({
        onComplete: () => {
          openTimelineRef.current = null;
          setIsProjectTransitioning(false);
        },
      });
      openTimelineRef.current = tl;

      if (animateHeight) {
        tl.to(
          detail,
          {
            height: heightTarget,
            duration: SWAP_IN_DURATION,
            ease: "power2.inOut",
            clearProps: "height,overflow",
          },
          0
        );
      } else {
        tl.set(detail, { clearProps: "height,overflow" }, 0);
      }

      if (projectContent) {
        tl.set(projectContent, { opacity: 1 }, 0);
      }

      tl.fromTo(
        pieces,
        { opacity: 0, x: SWAP_SHIFT * direction },
        {
          opacity: 1,
          x: 0,
          duration: SWAP_IN_DURATION,
          ease: "power2.out",
          stagger: { amount: 0.12, from: direction > 0 ? "start" : "end" },
          clearProps: "transform",
        },
        0.05
      );

      if (threeContainer) {
        tl.to(
          threeContainer,
          {
            alpha: 1,
            duration: 0.5,
            ease: "power2.out",
          },
          0.12
        );
      }
    };

    if (projectLoadTimeoutRef.current) {
      clearTimeout(projectLoadTimeoutRef.current);
      projectLoadTimeoutRef.current = null;
    }

    if (preload && !preload.complete) {
      let started = false;
      const go = () => {
        if (started) return;
        started = true;
        if (projectLoadTimeoutRef.current) {
          clearTimeout(projectLoadTimeoutRef.current);
          projectLoadTimeoutRef.current = null;
        }
        start();
      };
      preload.addEventListener("load", go, { once: true });
      preload.addEventListener("error", go, { once: true });
      // A slow image does not get to hold the panel open indefinitely: past the
      // cap the entrance runs anyway and the picture arrives when it arrives.
      projectLoadTimeoutRef.current = setTimeout(go, SWAP_DECODE_CAP);
    } else {
      start();
    }
  };

  const onProjectPrevClick = () => startProjectSwap(-1);

  const onProjectCloseClick = () => {
    if (isClosing) return;

    if (projectLoadTimeoutRef.current) {
      clearTimeout(projectLoadTimeoutRef.current);
      projectLoadTimeoutRef.current = null;
    }

    killOpenTimeline();
    killSwapTimeline();

    setIsClosing(true);
    // Closing part way through the load deliberately leaves the panel collapsed
    // and the loader mounted: both fade out with the panel below, where
    // dropping them here would snap the panel to full height under the exit.
    // The !isProjectActive branch resets them once the panel is gone.
    // A prev/next cross-fade may have been interrupted below; clear its lock so
    // the controls are not left disabled when a project is next opened.
    setIsProjectTransitioning(false);

    const detail = mountRef.current;
    const threeContainer = threeContainerRef.current;

    const finish = () => {
      closeTimelineRef.current = null;
      returningToGridRef.current = true;
      setIsClosing(false);
      setIsProjectActive(false);
    };

    if (!detail) {
      finish();
      return;
    }

    const projectContent = detail.querySelector(".project-content");
    const pieces = [
      detail.querySelector(".project-header h2"),
      detail.querySelector(".project-header .tools"),
      detail.querySelector(".project-header .project-controls"),
      ...detail.querySelectorAll(".case-block"),
    ].filter(Boolean);

    // Nothing else may be tweening these elements once the exit starts: the
    // entrance timeline is already dead, but a project prev/next cross-fade can
    // still be running on the content wrapper.
    gsap.killTweensOf([...pieces, detail]);
    if (projectContent) {
      gsap.killTweensOf(projectContent);
    }
    // A swap killed part way through leaves its slide offset on the content,
    // and these are the same nodes the next project is rendered into.
    gsap.set(pieces, { clearProps: "x" });

    const tl = gsap.timeline({ onComplete: finish });
    closeTimelineRef.current = tl;

    if (pieces.length > 0) {
      tl.to(
        pieces,
        {
          opacity: 0,
          y: 12,
          duration: 0.18,
          ease: "power2.in",
          stagger: { amount: 0.07, from: "end" },
        },
        0
      );
    }

    tl.to(detail, { opacity: 0, duration: 0.2, ease: "power2.in" }, 0.06);

    if (threeContainer) {
      // The scene still outlives the panel, but only just -- the whole exit is
      // 0.30s now rather than 0.45s. The backdrop is what is left behind rather
      // than the grid arriving on top of a live canvas.
      gsap.killTweensOf(threeContainer);
      tl.to(threeContainer, { alpha: 0, duration: 0.3, ease: "power2.inOut" }, 0);
    }
  };

  const onProjectNextClick = () => startProjectSwap(1);

  // The one exit that costs no room on screen, which is what makes it worth
  // having now that the controls at the top of a study scroll away from under
  // the reader. The lightbox takes it first: it is the inner layer, and closing
  // the whole study out from under an open image would be a surprise.
  useEffect(() => {
    if (!isProjectActive) return undefined;

    const handleKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (isGalleryOpen) {
        setIsGalleryOpen(false);
      } else {
        onProjectCloseClick();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isProjectActive, isGalleryOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // A plate is the only way into the lightbox now that the thumbnail strip is
  // gone, so it does both jobs the strip and the hero image used to split
  // between them: it moves the shape in the scene behind the panel to this
  // image, and it opens the full size view.
  const onFigureClick = (index) => {
    setActiveImageIndex(index);
    setCurrentTexture(projects[activeProjectID].images[index]);
    setIsGalleryOpen(true);
  };

  const onGalleryPrevClick = (e) => {
    e.stopPropagation();
    if (isTransitioning) return;

    const images = projects[activeProjectID].images;
    const prevIndex = (activeImageIndex - 1 + images.length) % images.length;

    setPreviousImageIndex(activeImageIndex);
    setIsTransitioning(true);
    setTransitionDirection('backward');

    setTimeout(() => {
      setActiveImageIndex(prevIndex);
      setCurrentTexture(images[prevIndex]);

      setTimeout(() => {
        setIsTransitioning(false);
      }, 400);
    }, 50);
  };

  const onGalleryNextClick = (e) => {
    e.stopPropagation();
    if (isTransitioning) return;

    const images = projects[activeProjectID].images;
    const nextIndex = (activeImageIndex + 1) % images.length;

    setPreviousImageIndex(activeImageIndex);
    setIsTransitioning(true);
    setTransitionDirection('forward');

    setTimeout(() => {
      setActiveImageIndex(nextIndex);
      setCurrentTexture(images[nextIndex]);

      setTimeout(() => {
        setIsTransitioning(false);
      }, 400);
    }, 50);
  };

  const onGalleryClose = (e) => {
    if (e) e.stopPropagation();
    setIsGalleryOpen(false);
  };

  if (isProjectActive) {
    const project = projects[activeProjectID];

    // Safety check: ensure activeImageIndex is within bounds
    if (!project || !project.images || project.images.length === 0) {
      return null;
    }

    const safeImageIndex = Math.min(activeImageIndex, project.images.length - 1);
    const currentImage = project.images[safeImageIndex];
    const captions = project.captions || [];
    const caseBlocks = buildCaseBlocks(project);

    return (
      <div
        className={`project-detail ${isProjectLoading ? "is-loading" : ""}`}
        ref={mountRef}
      >
        {isLoaderMounted && (
          <div className="project-loader">
            <HexagonLoader />
          </div>
        )}
        <div className="project-header">
          <div className="project-meta">
            <h2>{project.title}</h2>
            <ul className="tools">
              {project.tools.map((tool, i) => (
                <li key={i}>{tool}</li>
              ))}
            </ul>
          </div>
          <ProjectControls
            onPrev={onProjectPrevClick}
            onClose={onProjectCloseClick}
            onNext={onProjectNextClick}
          />
        </div>

        <div className="project-content">
          <div className="case-flow">
            {caseBlocks.map((block) =>
              block.type === "prose" ? (
                <div
                  key={block.key}
                  className={`case-block case-prose${
                    block.offset ? " case-prose--offset" : ""
                  }`}
                >
                  {block.heading && (
                    <h3 className="case-heading">{block.heading}</h3>
                  )}
                  <span dangerouslySetInnerHTML={{ __html: block.body }}></span>
                </div>
              ) : (
                <div
                  key={block.key}
                  className={`case-block case-plate${
                    block.figures.length > 1 ? " case-plate--grid" : ""
                  }`}
                >
                  {block.figures.map((n) => (
                    <figure
                      key={n}
                      className={`case-figure${
                        n === safeImageIndex ? " is-active" : ""
                      }`}
                    >
                      <button
                        type="button"
                        className="case-figure-frame"
                        onClick={() => onFigureClick(n)}
                        aria-label={`View full size: ${
                          captions[n] || project.title
                        }`}
                      >
                        <img
                          // A plate in a pair renders at roughly half the
                          // panel's width, which is what the 800px derivative
                          // was cut for. Only a plate standing on its own is
                          // wide enough to need the original.
                          src={
                            block.figures.length > 1
                              ? thumbURL(project.images[n])
                              : project.images[n]
                          }
                          alt={captions[n] || ""}
                          // Every plate is in the document from the moment the
                          // panel opens now, and a study runs to several
                          // screens of them. Only the ones in the entrance can
                          // be seen while it plays.
                          loading={
                            block.lead && n === block.figures[0]
                              ? "eager"
                              : "lazy"
                          }
                        />
                        <span className="case-figure-magnify" aria-hidden="true">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            <line x1="11" y1="8" x2="11" y2="14"></line>
                            <line x1="8" y1="11" x2="14" y2="11"></line>
                          </svg>
                        </span>
                      </button>
                      {captions[n] && <figcaption>{captions[n]}</figcaption>}
                    </figure>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        {isGalleryOpen && (
          <div
            className="gallery-lightbox"
            onClick={onGalleryClose}
          >
            <div className="lightbox-content">
              {isTransitioning && (
                <img
                  src={project.images[previousImageIndex]}
                  alt={project.title}
                  className={`lightbox-image-previous ${transitionDirection}`}
                />
              )}
              <img
                src={currentImage}
                alt={project.title}
                className={isTransitioning ? `lightbox-image-current transitioning ${transitionDirection}` : "lightbox-image-current"}
              />
              <button
                className="lightbox-close"
                onClick={onGalleryClose}
                aria-label="Close"
              >
                <img src={close} alt="Close" />
              </button>
              {project.images.length > 1 && (
                <>
                  <button
                    className="lightbox-prev"
                    onClick={onGalleryPrevClick}
                    aria-label="Previous Image"
                  >
                    <img src={left} alt="Previous" />
                  </button>
                  <button
                    className="lightbox-next"
                    onClick={onGalleryNextClick}
                    aria-label="Next Image"
                  >
                    <img src={right} alt="Next" />
                  </button>
                </>
              )}
              {captions[safeImageIndex] && (
                <div className="lightbox-caption">
                  {captions[safeImageIndex]}
                </div>
              )}
              <div className="lightbox-counter">
                {safeImageIndex + 1} / {project.images.length}
              </div>
            </div>
          </div>
        )}

        {/*
          Repeated at the end of the flow rather than pinned over it. A study is
          read top to bottom, so this is where it is finished with -- and
          nothing has to sit over the plates for the whole of the read to put it
          there.
        */}
        <div className="project-footer-nav">
          <ProjectControls
            onPrev={onProjectPrevClick}
            onClose={onProjectCloseClick}
            onNext={onProjectNextClick}
          />
        </div>

        <div className="project-pagination">
          Case Study {activeProjectID + 1} of {projects.length}
        </div>
      </div>
    );
  }

  return (
    <ul className="project-grid" ref={mountRef}>
      {projects.map((project, i) => (
        <li
          key={i}
          className={activeThumbnailID === i ? 'active' : ''}
          role="button"
          tabIndex={0}
          aria-label={`Open case study: ${project.title}`}
          onMouseEnter={(e) => onProjectOver(i, e)}
          // Keyboard focus recolours the tile the same way a pointer does,
          // otherwise tabbing through the grid moves an invisible cursor.
          onFocus={(e) => {
            if (isKeyboardFocus(e.currentTarget)) onProjectOver(i, e);
          }}
          onClick={() => onProjectClick(i)}
          onKeyDown={(e) => onProjectKeyDown(i, e)}
        >
          <h4>{project.title}</h4>
          <div
            className="background"
            style={{
              backgroundImage: "url(" + thumbURL(project.images[0]) + ")",
            }}
          ></div>
        </li>
      ))}
      <GradientFiller />
    </ul>
  );
}

export default memo(ProjectGrid);
