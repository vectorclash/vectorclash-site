import { useState, useEffect, useRef, memo } from "react";
import { createRoot } from "react-dom/client";
import gsap from "gsap/all";
import ProjectsScene from "./three/r3f/ProjectsScene";
import GradientGenerator from "./utils/GradientGenerator";
import "./ProjectGrid.scss";
import tinycolor from "tinycolor2";

import left from "..//images/angle-left.svg";
import right from "../images/angle-right.svg";
import close from "../images/window-close.svg";

function ProjectGrid({ projects, threeContainerRef }) {
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

  const mountRef = useRef(null);
  const r3fRootRef = useRef(null);

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

  // Handle project activation and deactivation
  useEffect(() => {
    if (!mountRef.current) return;

    const projectContent = mountRef.current.querySelector(".project-content");

    if (isProjectActive && activeProjectID !== null) {
      const project = projects[activeProjectID];

      if (!project || !project.field_images || project.field_images.length === 0) {
        return;
      }

      // Set up project data
      let newVideo = null;
      if (project.field_videos && project.field_videos.length > 0 && window.innerWidth > 600) {
        newVideo = project.field_videos[Math.floor(Math.random() * project.field_videos.length)].url;
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

      // Animate project content
      if (projectContent) {
        gsap.set(projectContent, { opacity: 0 });
        setTimeout(() => {
          gsap.to(projectContent, {
            duration: 0.5,
            opacity: 1,
            ease: "power2.out",
          });
        }, 50);
      }

      if (threeContainerRef.current) {
        gsap.to(threeContainerRef.current, {
          alpha: 1,
          duration: 0.5,
          delay: 0.3,
        });
      }
    } else if (!isProjectActive) {
      setCurrentTexture(null);
      setCurrentVideo(null);
      setActiveImageIndex(0);
      setIsGalleryOpen(false);

      if (threeContainerRef.current) {
        gsap.set(threeContainerRef.current, {
          alpha: 0,
          duration: 0.5,
        });
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
        videoURL={currentVideo}
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
    if (isProjectTransitioning) return;

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
    setIsProjectActive(false);
  };

  const onProjectNextClick = () => {
    if (isProjectTransitioning) return;

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
    </ul>
  );
}

export default memo(ProjectGrid);
