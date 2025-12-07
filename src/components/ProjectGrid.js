import React from "react";
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

class ProjectGrid extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isProjectActive: false,
      activeProjectID: null,
      currentTexture: null,
      currentVideo: null,
      activeImageIndex: 0,
      isGalleryOpen: false,
      previousImageIndex: 0,
      isTransitioning: false,
      transitionDirection: 'forward',
      isProjectTransitioning: false,
      isLoadingProject: false,
      activeThumbnailID: null, // For mobile two-tap behavior
    };
    this.r3fRoot = null;
  }

  componentDidMount() {
    this.r3fRoot = createRoot(this.props.threeContainer);
    this.renderThreeScene();

    // Add click listener to deactivate thumbnails when clicking outside
    this.handleDocumentClick = (e) => {
      if (this.state.activeThumbnailID !== null && this.mount) {
        const clickedInsideGrid = this.mount.contains(e.target);
        if (!clickedInsideGrid) {
          this.setState({ activeThumbnailID: null });
        }
      }
    };
    document.addEventListener('click', this.handleDocumentClick);
  }

  preloadImages(imageUrls) {
    return Promise.all(
      imageUrls.map(url => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(url);
          img.onerror = () => reject(url);
          img.src = url;
        });
      })
    );
  }

  componentDidUpdate(prevProps, prevState) {
    const { isProjectActive, activeProjectID, currentTexture, currentVideo } = this.state;

    // Only animate when switching projects or toggling project active state
    if (activeProjectID !== prevState.activeProjectID || isProjectActive !== prevState.isProjectActive) {
      if (!this.mount) return;

      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        const projectContent = this.mount?.querySelector(".project-content");
        if (projectContent) {
          // Immediately hide the entire content area
          gsap.set(projectContent, {
            opacity: 0,
          });

          // Preload all images for this project
          if (isProjectActive && activeProjectID !== null) {
            const project = this.props.projects[activeProjectID];
            if (project && project.field_images && project.field_images.length > 0) {
              const imageUrls = project.field_images.map(img => img.url);
              this.preloadImages(imageUrls).then(() => {
                // All images loaded, now show content
                this.setState({ isLoadingProject: false }, () => {
                  // Then after React updates, start the fade-in animation
                  setTimeout(() => {
                    gsap.to(projectContent, {
                      duration: 0.5,
                      opacity: 1,
                      ease: "power2.out",
                    });
                  }, 50);
                });
              });
            }
          }
        }
      }, 0);
    }

    // When opening a project or switching between projects
    if (isProjectActive && (activeProjectID !== prevState.activeProjectID || !prevState.isProjectActive)) {
      const project = this.props.projects[activeProjectID];

      // Safety check
      if (!project || !project.field_images || project.field_images.length === 0) {
        return;
      }

      let newVideo = null;
      if (
        project.field_videos &&
        project.field_videos.length > 0 &&
        window.innerWidth > 600
      ) {
        newVideo =
          project.field_videos[
            Math.floor(Math.random() * project.field_videos.length)
          ].url;
      }

      const newTexture = project.field_images[0].url;
      const newColor = tinycolor("#CCFF00").spin(Math.random() * 360);

      this.setState({
        currentTexture: newTexture,
        currentVideo: newVideo,
        activeImageIndex: 0,
      });

      const headerElement = this.mount?.querySelector(".project-header");
      if (headerElement) {
        headerElement.style.borderBottomColor = newColor
          .setAlpha(0.4)
          .toRgbString();
      }

      gsap.to(this.props.threeContainer, {
        alpha: 1,
        duration: 0.5,
        delay: 0.3,
      });
    } else if (!isProjectActive && prevState.isProjectActive) {
      this.setState({
        currentTexture: null,
        currentVideo: null,
        activeImageIndex: 0,
        isGalleryOpen: false,
      });

      gsap.set(this.props.threeContainer, {
        alpha: 0,
        duration: 0.5,
      });
    }

    if (
      currentTexture !== prevState.currentTexture ||
      currentVideo !== prevState.currentVideo
    ) {
      this.renderThreeScene();
    }
  }

  componentWillUnmount() {
    if (this.r3fRoot) {
      this.r3fRoot.unmount();
    }
    // Remove document click listener
    document.removeEventListener('click', this.handleDocumentClick);
  }

  renderThreeScene() {
    if (!this.r3fRoot) return;

    // Collect all image URLs from all projects for preloading
    const allImageURLs = this.props.projects.reduce((urls, project) => {
      if (project.field_images && project.field_images.length > 0) {
        return [...urls, ...project.field_images.map(img => img.url)];
      }
      return urls;
    }, []);

    this.r3fRoot.render(
      <ProjectsScene
        key="projects-scene"
        textureURL={this.state.currentTexture}
        videoURL={this.state.currentVideo}
        allImageURLs={allImageURLs}
      />
    );
  }

  onProjectOver(index, e) {
    let colors = new GradientGenerator(2, true).colors;
    let colorString =
      "linear-gradient(42deg, " +
      colors[0].toHexString() +
      ", " +
      colors[1].toHexString() +
      ")";

    let textColor = "white";
    if (colors[0].isLight() && colors[1].isLight()) {
      textColor = "#454545";
    }

    gsap.set(e.currentTarget, {
      backgroundImage: colorString,
    });

    gsap.set(e.currentTarget.querySelector("h4"), {
      color: textColor,
      borderColor: textColor,
    });
  }

  onProjectClick(index, e) {
    const { activeThumbnailID } = this.state;

    // On mobile/touch devices, use two-tap behavior
    if (window.innerWidth <= 1024) {
      if (activeThumbnailID === index) {
        // Second tap - open the project
        this.setState({
          isProjectActive: true,
          activeProjectID: index,
          isLoadingProject: true,
          activeThumbnailID: null,
        });
      } else {
        // First tap - activate the thumbnail
        this.setState({
          activeThumbnailID: index,
        });
      }
    } else {
      // Desktop - direct click to open
      this.setState({
        isProjectActive: true,
        activeProjectID: index,
        isLoadingProject: true,
      });
    }
  }

  onProjectPrevClick(e) {
    if (this.state.isProjectTransitioning) return;

    this.setState({ isProjectTransitioning: true });

    // Calculate the new project ID
    let prevProject = this.state.activeProjectID - 1;
    if (prevProject < 0) {
      prevProject = this.props.projects.length - 1;
    }

    // Fade out current project content
    const projectContent = this.mount.querySelector(".project-content");
    gsap.to(projectContent, {
      duration: 0.3,
      opacity: 0,
      ease: "power2.in",
      onComplete: () => {
        this.setState({
          activeProjectID: prevProject,
          isProjectTransitioning: false,
          isLoadingProject: true,
        });
      }
    });
  }

  onProjectCloseClick(e) {
    this.setState({
      isProjectActive: false,
    });
  }

  onProjectNextClick(e) {
    if (this.state.isProjectTransitioning) return;

    this.setState({ isProjectTransitioning: true });

    // Calculate the new project ID
    let nextProject = this.state.activeProjectID + 1;
    if (nextProject >= this.props.projects.length) {
      nextProject = 0;
    }

    // Fade out current project content
    const projectContent = this.mount.querySelector(".project-content");
    gsap.to(projectContent, {
      duration: 0.3,
      opacity: 0,
      ease: "power2.in",
      onComplete: () => {
        this.setState({
          activeProjectID: nextProject,
          isProjectTransitioning: false,
          isLoadingProject: true,
        });
      }
    });
  }

  onImageClick(index, e) {
    const { activeProjectID } = this.state;
    const newTexture = this.props.projects[activeProjectID].field_images[index].url;
    this.setState({
      activeImageIndex: index,
      currentTexture: newTexture
    });
  }

  onMainImageClick() {
    this.setState({ isGalleryOpen: true });
  }

  onGalleryPrevClick(e) {
    e.stopPropagation();
    const { activeProjectID, activeImageIndex, isTransitioning } = this.state;
    if (isTransitioning) return;

    const images = this.props.projects[activeProjectID].field_images;
    const prevIndex = (activeImageIndex - 1 + images.length) % images.length;

    this.setState({
      previousImageIndex: activeImageIndex,
      isTransitioning: true,
      transitionDirection: 'backward',
    });

    setTimeout(() => {
      this.setState({
        activeImageIndex: prevIndex,
        currentTexture: images[prevIndex].url,
      });

      setTimeout(() => {
        this.setState({ isTransitioning: false });
      }, 400);
    }, 50);
  }

  onGalleryNextClick(e) {
    e.stopPropagation();
    const { activeProjectID, activeImageIndex, isTransitioning } = this.state;
    if (isTransitioning) return;

    const images = this.props.projects[activeProjectID].field_images;
    const nextIndex = (activeImageIndex + 1) % images.length;

    this.setState({
      previousImageIndex: activeImageIndex,
      isTransitioning: true,
      transitionDirection: 'forward',
    });

    setTimeout(() => {
      this.setState({
        activeImageIndex: nextIndex,
        currentTexture: images[nextIndex].url,
      });

      setTimeout(() => {
        this.setState({ isTransitioning: false });
      }, 400);
    }, 50);
  }

  onGalleryClose(e) {
    if (e) e.stopPropagation();
    this.setState({ isGalleryOpen: false });
  }

  render() {
    const { isProjectActive, activeProjectID, activeImageIndex, isGalleryOpen, previousImageIndex, isTransitioning, transitionDirection, isLoadingProject, activeThumbnailID } = this.state;

    if (isProjectActive) {
      const project = this.props.projects[activeProjectID];

      // Safety check: ensure activeImageIndex is within bounds
      if (!project || !project.field_images || project.field_images.length === 0) {
        return null;
      }

      const safeImageIndex = Math.min(activeImageIndex, project.field_images.length - 1);
      const currentImage = project.field_images[safeImageIndex];

      return (
        <div
          className="project-detail"
          ref={(mount) => {
            this.mount = mount;
          }}
        >
          {isLoadingProject && (
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
                onClick={(e) => this.onProjectPrevClick(e)}
                title="Previous Project"
              >
                <img src={left} alt="Previous Project" />
              </div>
              <div
                className="close-button"
                onClick={(e) => this.onProjectCloseClick(e)}
                title="Close"
              >
                <img src={close} alt="Close Project" />
              </div>
              <div
                className="next-button"
                onClick={(e) => this.onProjectNextClick(e)}
                title="Next Project"
              >
                <img src={right} alt="Next Project" />
              </div>
            </div>
          </div>

          <div className={`project-content ${isLoadingProject ? 'hidden' : ''}`}>
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
                  onClick={() => this.onMainImageClick()}
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
                    onClick={(e) => this.onImageClick(i, e)}
                  >
                    <img src={image.url} alt="" />
                  </div>
                ))}
              </div>

              {project.field_images.length > 1 && (
                <div className="gallery-nav">
                  <button
                    className="gallery-nav-prev"
                    onClick={(e) => this.onGalleryPrevClick(e)}
                    aria-label="Previous Image"
                  >
                    <img src={left} alt="Previous" />
                  </button>
                  <button
                    className="gallery-nav-next"
                    onClick={(e) => this.onGalleryNextClick(e)}
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
              onClick={(e) => this.onGalleryClose(e)}
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
                  onClick={(e) => this.onGalleryClose(e)}
                  aria-label="Close"
                >
                  <img src={close} alt="Close" />
                </button>
                {project.field_images.length > 1 && (
                  <>
                    <button
                      className="lightbox-prev"
                      onClick={(e) => this.onGalleryPrevClick(e)}
                      aria-label="Previous Image"
                    >
                      <img src={left} alt="Previous" />
                    </button>
                    <button
                      className="lightbox-next"
                      onClick={(e) => this.onGalleryNextClick(e)}
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
            Project {activeProjectID + 1} of {this.props.projects.length}
          </div>
        </div>
      );
    } else {
      return (
        <ul
          className="project-grid"
          ref={(mount) => {
            this.mount = mount;
          }}
        >
          {this.props.projects.map((project, i) => (
            <li
              key={i}
              className={activeThumbnailID === i ? 'active' : ''}
              onMouseEnter={(e) => this.onProjectOver(i, e)}
              onClick={(e) => this.onProjectClick(i, e)}
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
  }
}

export default React.memo(ProjectGrid);
