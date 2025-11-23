import React from "react";
import { createRoot } from "react-dom/client";
import gsap from "gsap/all";
import ProjectsScene from "./three/r3f/ProjectsScene";
import GradientGenerator from "./utils/GradientGenerator";
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
    };
    this.r3fRoot = null;
  }

  componentDidMount() {
    this.r3fRoot = createRoot(this.props.threeContainer);
    this.renderThreeScene();
  }

  componentDidUpdate(prevProps, prevState) {
    const { isProjectActive, activeProjectID, currentTexture, currentVideo } = this.state;

    // Only animate when switching projects or toggling project active state
    if (activeProjectID !== prevState.activeProjectID || isProjectActive !== prevState.isProjectActive) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        if (!this.mount) return;

        const elements = this.mount.querySelectorAll("li, .project-description, .thumbnail, h2, .tools, .gallery-main");
        if (elements.length > 0) {
          gsap.fromTo(
            elements,
            {
              opacity: 0,
              y: 20,
            },
            {
              duration: 0.4,
              opacity: 1,
              y: 0,
              ease: "power2.out",
              stagger: {
                amount: 0.3,
              },
              delay: 0.1,
            }
          );
        }
      });
    }

    if (isProjectActive && activeProjectID !== prevState.activeProjectID) {
      let newVideo = null;
      if (
        this.props.projects[activeProjectID].field_videos.length > 0 &&
        window.innerWidth > 600
      ) {
        newVideo =
          this.props.projects[activeProjectID].field_videos[
            Math.floor(
              Math.random() *
                this.props.projects[activeProjectID].field_videos.length
            )
          ].url;
      }

      const newTexture = this.props.projects[activeProjectID].field_images[0].url;
      const newColor = tinycolor("#CCFF00").spin(Math.random() * 360);

      this.setState({
        currentTexture: newTexture,
        currentVideo: newVideo,
        activeImageIndex: 0,
      });

      const headerElement = this.mount.querySelector(".project-header");
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
  }

  renderThreeScene() {
    if (!this.r3fRoot) return;

    this.r3fRoot.render(
      <ProjectsScene
        textureURL={this.state.currentTexture}
        videoURL={this.state.currentVideo}
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
    this.setState({
      isProjectActive: true,
      activeProjectID: index,
    });
  }

  onProjectPrevClick(e) {
    let prevProject = this.state.activeProjectID - 1;
    if (prevProject < 0) {
      prevProject = this.props.projects.length - 1;
    }

    this.setState({
      activeProjectID: prevProject,
    });
  }

  onProjectCloseClick(e) {
    this.setState({
      isProjectActive: false,
    });
  }

  onProjectNextClick(e) {
    let nextProject = this.state.activeProjectID + 1;
    if (nextProject >= this.props.projects.length) {
      nextProject = 0;
    }

    this.setState({
      activeProjectID: nextProject,
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
    const { isProjectActive, activeProjectID, activeImageIndex, isGalleryOpen, previousImageIndex, isTransitioning, transitionDirection } = this.state;

    if (isProjectActive) {
      const project = this.props.projects[activeProjectID];
      const currentImage = project.field_images[activeImageIndex];

      return (
        <div
          className="project-detail"
          ref={(mount) => {
            this.mount = mount;
          }}
        >
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
                  {activeImageIndex + 1} / {project.field_images.length}
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
                    className={`thumbnail ${i === activeImageIndex ? "active" : ""}`}
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
                  {activeImageIndex + 1} / {project.field_images.length}
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
            <li key={i} onMouseEnter={(e) => this.onProjectOver(i, e)}>
              <h4>{project.title[0].value}</h4>
              <div
                className="background"
                style={{
                  backgroundImage: "url(" + project.field_images[0].url + ")",
                }}
              ></div>
              <div
                className="click-area"
                onClick={(e) => this.onProjectClick(i, e)}
              ></div>
            </li>
          ))}
        </ul>
      );
    }
  }
}

export default React.memo(ProjectGrid);
