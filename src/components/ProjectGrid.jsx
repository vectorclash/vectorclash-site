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

// Grid tiles render at roughly 390x220 and gallery thumbnails at 100-150px
// wide, so both were being handed 1920x1080 sources -- around 2MB of decode
// work for the seven tiles alone. The 800px derivatives sit next to each
// original; the full-size file is still what the lightbox and the 3D shape use.
const thumbURL = (url) => url.replace(/\.jpg$/, "_thumb.jpg");

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

  const killOpenTimeline = () => {
    if (openTimelineRef.current) {
      openTimelineRef.current.kill();
      openTimelineRef.current = null;
    }
  };

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

      if (!project || !project.field_images || project.field_images.length === 0) {
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

      // Set up project data
      let newVideo = null;
      if (project.field_videos && project.field_videos.length > 0) {
        newVideo = project.field_videos.map(v => v.url);
      }

      const newImageURLs = project.field_images.map((img) => img.url);
      const newTexture = newImageURLs[0];
      const newColor = tinycolor("#CCFF00").spin(Math.random() * 360);

      setCurrentImageURLs(newImageURLs);
      setCurrentTexture(newTexture);
      setCurrentVideo(newVideo);
      setActiveImageIndex(0);

      // Update header color
      const headerElement = mountRef.current.querySelector(".project-header");
      if (headerElement) {
        headerElement.style.borderBottomColor = newColor.setAlpha(0.4).toRgbString();
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

        // The scene canvas is height:100% of a section that is about to grow
        // for the length of the expansion, so it was resizing every frame of
        // it -- and with the postprocessing composer mounted, reallocating its
        // render targets every frame too. That is what was arriving half drawn
        // and snapping into place at the end. Pinning the container to the
        // height the section is about to have takes the resize out of the
        // animation entirely: one resize, here, while the canvas is still at
        // zero alpha and nobody can see it. By the time the tween clears this
        // the section has caught up, so the pin comes off against an identical
        // height and costs a second resize of nothing.
        const section = threeContainerRef.current?.parentElement;
        if (section) {
          gsap.set(threeContainerRef.current, { height: section.offsetHeight });
        }

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
        const description = projectContent?.querySelector(".project-description");
        const galleryMain = projectContent?.querySelector(".gallery-main");
        const thumbnails = projectContent?.querySelectorAll(".thumbnail");

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
            height: expandedHeight,
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

        // Animate description
        if (description) {
          tl.fromTo(
            description,
            { y: 30, opacity: 0 },
            { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
            0.1
          );
        }

        // Animate gallery main image
        if (galleryMain) {
          tl.fromTo(
            galleryMain,
            { y: 30, opacity: 0 },
            { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
            0.15
          );
        }

        // Animate thumbnails with stagger - slide up from below
        if (thumbnails && thumbnails.length > 0) {
          tl.fromTo(
            thumbnails,
            { y: 30, opacity: 0 },
            { opacity: 1, y: 0, duration: 0.5, stagger: 0.04, ease: "bounce.out" },
            0.2
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
              // The pin comes off here rather than with the height tween, so
              // nothing touches the canvas size while it is fading up.
              clearProps: "height",
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
        // clearProps as well as alpha: a close part way through the entrance
        // kills the tween that would otherwise have taken the height pin off.
        gsap.set(threeContainerRef.current, { alpha: 0, clearProps: "height" });
      }

      // Returning from a project: stagger the tiles back in rather than having
      // the whole grid appear at once where the panel used to be.
      if (returningToGridRef.current) {
        returningToGridRef.current = false;
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
        setIsProjectActive(true);
        setActiveProjectID(index);
        setActiveThumbnailID(null);
      } else {
        // First tap - activate the thumbnail
        setActiveThumbnailID(index);
      }
    } else {
      // Desktop - direct click to open
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
    setIsProjectActive(true);
    setActiveProjectID(index);
    setActiveThumbnailID(null);
  };

  const onProjectPrevClick = () => {
    if (isProjectTransitioning || isClosing) return;

    setIsProjectTransitioning(true);

    const prevProject = activeProjectID - 1 < 0 ? projects.length - 1 : activeProjectID - 1;

    // Fade out current project content
    const projectContent = mountRef.current.querySelector(".project-content");
    gsap.to(projectContent, {
      duration: 0.3,
      opacity: 0,
      ease: "power2.in",
      onComplete: () => {
        setActiveProjectID(prevProject);
        setIsProjectTransitioning(false);
      }
    });
  };

  const onProjectCloseClick = () => {
    if (isClosing) return;

    if (projectLoadTimeoutRef.current) {
      clearTimeout(projectLoadTimeoutRef.current);
      projectLoadTimeoutRef.current = null;
    }

    killOpenTimeline();

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
      detail.querySelector(".project-description"),
      detail.querySelector(".gallery-main"),
      ...detail.querySelectorAll(".thumbnail"),
    ].filter(Boolean);

    // Nothing else may be tweening these elements once the exit starts: the
    // entrance timeline is already dead, but a project prev/next cross-fade can
    // still be running on the content wrapper.
    gsap.killTweensOf([...pieces, detail]);
    if (projectContent) {
      gsap.killTweensOf(projectContent);
    }

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

  const onProjectNextClick = () => {
    if (isProjectTransitioning || isClosing) return;

    setIsProjectTransitioning(true);

    const nextProject = activeProjectID + 1 >= projects.length ? 0 : activeProjectID + 1;

    // Fade out current project content
    const projectContent = mountRef.current.querySelector(".project-content");
    gsap.to(projectContent, {
      duration: 0.3,
      opacity: 0,
      ease: "power2.in",
      onComplete: () => {
        setActiveProjectID(nextProject);
        setIsProjectTransitioning(false);
      }
    });
  };

  const onImageClick = (index) => {
    const newTexture = projects[activeProjectID].field_images[index].url;
    setActiveImageIndex(index);
    setCurrentTexture(newTexture);
  };

  const onMainImageClick = () => {
    setIsGalleryOpen(true);
  };

  const onGalleryPrevClick = (e) => {
    e.stopPropagation();
    if (isTransitioning) return;

    const images = projects[activeProjectID].field_images;
    const prevIndex = (activeImageIndex - 1 + images.length) % images.length;

    setPreviousImageIndex(activeImageIndex);
    setIsTransitioning(true);
    setTransitionDirection('backward');

    setTimeout(() => {
      setActiveImageIndex(prevIndex);
      setCurrentTexture(images[prevIndex].url);

      setTimeout(() => {
        setIsTransitioning(false);
      }, 400);
    }, 50);
  };

  const onGalleryNextClick = (e) => {
    e.stopPropagation();
    if (isTransitioning) return;

    const images = projects[activeProjectID].field_images;
    const nextIndex = (activeImageIndex + 1) % images.length;

    setPreviousImageIndex(activeImageIndex);
    setIsTransitioning(true);
    setTransitionDirection('forward');

    setTimeout(() => {
      setActiveImageIndex(nextIndex);
      setCurrentTexture(images[nextIndex].url);

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
    if (!project || !project.field_images || project.field_images.length === 0) {
      return null;
    }

    const safeImageIndex = Math.min(activeImageIndex, project.field_images.length - 1);
    const currentImage = project.field_images[safeImageIndex];

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
            <h2>{project.title[0].value}</h2>
            <ul className="tools">
              {project.field_tools.map((tool, i) => (
                <li key={i}>{tool.value}</li>
              ))}
            </ul>
          </div>
          <div className="project-controls">
            <button
              type="button"
              className="prev-button"
              onClick={onProjectPrevClick}
              title="Previous Project"
              aria-label="Previous Project"
            >
              <img src={left} alt="" />
            </button>
            <button
              type="button"
              className="close-button"
              onClick={onProjectCloseClick}
              title="Close"
              aria-label="Close Project"
            >
              <img src={close} alt="" />
            </button>
            <button
              type="button"
              className="next-button"
              onClick={onProjectNextClick}
              title="Next Project"
              aria-label="Next Project"
            >
              <img src={right} alt="" />
            </button>
          </div>
        </div>

        <div className="project-content">
          <div className="project-description">
            <span
              dangerouslySetInnerHTML={{
                __html: project.body[0].value,
              }}
            ></span>
          </div>

          <div className="project-gallery">
            <div className="gallery-main">
              <img src={currentImage.url} alt={project.title[0].value} />
              <div className="gallery-counter">
                {safeImageIndex + 1} / {project.field_images.length}
              </div>
              <button
                className="gallery-magnify"
                onClick={onMainImageClick}
                aria-label="View Full Size"
                title="View Full Size"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="11" y1="8" x2="11" y2="14"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
              </button>
            </div>

            <div className="gallery-thumbnails">
              {project.field_images.map((image, i) => (
                <div
                  className={`thumbnail ${i === safeImageIndex ? "active" : ""}`}
                  key={i}
                  onClick={() => onImageClick(i)}
                >
                  <img src={thumbURL(image.url)} alt="" loading="lazy" />
                </div>
              ))}
            </div>

            {project.field_images.length > 1 && (
              <div className="gallery-nav">
                <button
                  className="gallery-nav-prev"
                  onClick={onGalleryPrevClick}
                  aria-label="Previous Image"
                >
                  <img src={left} alt="Previous" />
                </button>
                <button
                  className="gallery-nav-next"
                  onClick={onGalleryNextClick}
                  aria-label="Next Image"
                >
                  <img src={right} alt="Next" />
                </button>
              </div>
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
                  src={project.field_images[previousImageIndex].url}
                  alt={project.title[0].value}
                  className={`lightbox-image-previous ${transitionDirection}`}
                />
              )}
              <img
                src={currentImage.url}
                alt={project.title[0].value}
                className={isTransitioning ? `lightbox-image-current transitioning ${transitionDirection}` : "lightbox-image-current"}
              />
              <button
                className="lightbox-close"
                onClick={onGalleryClose}
                aria-label="Close"
              >
                <img src={close} alt="Close" />
              </button>
              {project.field_images.length > 1 && (
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
              <div className="lightbox-counter">
                {safeImageIndex + 1} / {project.field_images.length}
              </div>
            </div>
          </div>
        )}

        <div className="project-pagination">
          Project {activeProjectID + 1} of {projects.length}
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
          aria-label={`Open project: ${project.title[0].value}`}
          onMouseEnter={(e) => onProjectOver(i, e)}
          // Keyboard focus recolours the tile the same way a pointer does,
          // otherwise tabbing through the grid moves an invisible cursor.
          onFocus={(e) => {
            if (isKeyboardFocus(e.currentTarget)) onProjectOver(i, e);
          }}
          onClick={() => onProjectClick(i)}
          onKeyDown={(e) => onProjectKeyDown(i, e)}
        >
          <h4>{project.title[0].value}</h4>
          <div
            className="background"
            style={{
              backgroundImage: "url(" + thumbURL(project.field_images[0].url) + ")",
            }}
          ></div>
        </li>
      ))}
      <GradientFiller />
    </ul>
  );
}

export default memo(ProjectGrid);
