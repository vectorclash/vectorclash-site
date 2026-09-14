import { useState, useEffect, useLayoutEffect, useRef, memo } from "react";
import { createRoot } from "react-dom/client";
import gsap from "gsap/all";
import ProjectsScene from "./three/r3f/ProjectsScene";
import GradientGenerator from "./utils/GradientGenerator";
import HexagonLoader from "./HexagonLoader";
import "./ProjectGrid.scss";
import tinycolor from "tinycolor2";

import left from "..//images/angle-left.svg";
import right from "../images/angle-right.svg";
import close from "../images/window-close.svg";
import me from "../images/me.png";

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
      const next = generateGradient();
      layerBRef.current.style.backgroundImage = next;
      gsap.to(layerBRef.current, {
        opacity: 1,
        duration: 3.5,
        ease: 'power2.inOut',
        onComplete: () => {
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
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [previousImageIndex, setPreviousImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState('forward');
  const [isProjectTransitioning, setIsProjectTransitioning] = useState(false);
  const [activeThumbnailID, setActiveThumbnailID] = useState(null);
  const [isProjectLoading, setIsProjectLoading] = useState(false);
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

    // Add click listener to deactivate thumbnails when clicking outside
    const handleDocumentClick = (e) => {
      if (activeThumbnailID !== null && mountRef.current) {
        const clickedInsideGrid = mountRef.current.contains(e.target);
        if (!clickedInsideGrid) {
          setActiveThumbnailID(null);
        }
      }
    };
    document.addEventListener('click', handleDocumentClick);

    return () => {
      if (r3fRootRef.current) {
        r3fRootRef.current.unmount();
      }
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [threeContainerRef]);

  // Update Three.js scene when texture or video changes
  useEffect(() => {
    renderThreeScene();
  }, [currentTexture, currentVideo]);

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

      // Set up project data
      let newVideo = null;
      if (project.field_videos && project.field_videos.length > 0) {
        newVideo = project.field_videos.map(v => v.url);
      }

      const newTexture = project.field_images[0].url;
      const newColor = tinycolor("#CCFF00").spin(Math.random() * 360);

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

      // Sequence: Show loader (500ms) → Hide loader → Animate in content.
      // The whole entrance is one timeline held in a ref so that closing part
      // way through can kill it outright. As separate delayed tweens it kept
      // writing opacity and y on the same elements as the exit animation, and
      // the two fought each other frame by frame.
      if (projectLoadTimeoutRef.current) {
        clearTimeout(projectLoadTimeoutRef.current);
      }
      projectLoadTimeoutRef.current = setTimeout(() => {
        // Hide loader
        setIsProjectLoading(false);

        const header = mountRef.current?.querySelector(".project-header");
        const projectTitle = header?.querySelector("h2");
        const tools = header?.querySelector(".tools");
        const controls = header?.querySelector(".project-controls");
        const description = projectContent?.querySelector(".project-description");
        const galleryMain = projectContent?.querySelector(".gallery-main");
        const thumbnails = projectContent?.querySelectorAll(".thumbnail");

        killOpenTimeline();

        const tl = gsap.timeline({
          onComplete: () => {
            openTimelineRef.current = null;
          },
        });
        openTimelineRef.current = tl;

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

        // Fade in Three.js background
        if (threeContainerRef.current) {
          tl.to(threeContainerRef.current, { alpha: 1, duration: 0.6, ease: "power2.out" }, 0);
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
      setActiveImageIndex(0);
      setIsGalleryOpen(false);
      setIsProjectLoading(false);

      if (threeContainerRef.current) {
        gsap.killTweensOf(threeContainerRef.current);
        gsap.set(threeContainerRef.current, { alpha: 0 });
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
              duration: 0.45,
              ease: "power2.out",
              stagger: { amount: 0.25 },
              clearProps: "opacity,transform",
            }
          );
        }
      }
    }
  }, [isProjectActive, activeProjectID]);

  const renderThreeScene = () => {
    if (!r3fRootRef.current) return;

    // Collect all image URLs from all projects for preloading
    const allImageURLs = projects.reduce((urls, project) => {
      if (project.field_images && project.field_images.length > 0) {
        return [...urls, ...project.field_images.map(img => img.url)];
      }
      return urls;
    }, []);

    r3fRootRef.current.render(
      <ProjectsScene
        key="projects-scene"
        textureURL={currentTexture}
        videoURLs={currentVideo}
        allImageURLs={allImageURLs}
      />
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
    setIsProjectLoading(false);
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
          duration: 0.25,
          ease: "power2.in",
          stagger: { amount: 0.12, from: "end" },
        },
        0
      );
    }

    tl.to(detail, { opacity: 0, duration: 0.3, ease: "power2.in" }, 0.15);

    if (threeContainer) {
      // The scene outlives the panel by a beat, so the dark backdrop is what is
      // left behind rather than the grid arriving on top of a live canvas.
      gsap.killTweensOf(threeContainer);
      tl.to(threeContainer, { alpha: 0, duration: 0.45, ease: "power2.inOut" }, 0);
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
      <div className="project-detail" ref={mountRef}>
        {isProjectLoading && (
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
            <div
              className="prev-button"
              onClick={onProjectPrevClick}
              title="Previous Project"
            >
              <img src={left} alt="Previous Project" />
            </div>
            <div
              className="close-button"
              onClick={onProjectCloseClick}
              title="Close"
            >
              <img src={close} alt="Close Project" />
            </div>
            <div
              className="next-button"
              onClick={onProjectNextClick}
              title="Next Project"
            >
              <img src={right} alt="Next Project" />
            </div>
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
                  <img src={image.url} alt="" />
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
          onMouseEnter={(e) => onProjectOver(i, e)}
          onClick={() => onProjectClick(i)}
        >
          <h4>{project.title[0].value}</h4>
          <div
            className="background"
            style={{
              backgroundImage: "url(" + project.field_images[0].url + ")",
            }}
          ></div>
        </li>
      ))}
      <GradientFiller />
    </ul>
  );
}

export default memo(ProjectGrid);
