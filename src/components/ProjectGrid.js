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
    };
    this.r3fRoot = null;
  }

  componentDidMount() {
    this.r3fRoot = createRoot(this.props.threeContainer);
    this.renderThreeScene();
  }

  componentDidUpdate(prevProps, prevState) {
    const { isProjectActive, activeProjectID, currentTexture, currentVideo } = this.state;

    gsap.fromTo(
      this.mount.querySelectorAll("li, .project-text, .project-images-item"),
      {
        alpha: 0,
      },
      {
        duration: 0.3,
        alpha: 1,
        ease: "quad.inOut",
        stagger: {
          amount: 0.5,
        },
        delay: 0.2,
      }
    );

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
      });

      document.querySelector(".project-text").style.borderBottomColor = newColor
        .setAlpha(0.4)
        .toRgbString();

      let imageItems = this.mount.querySelectorAll(".project-images-item");
      for (let i = 0; i < imageItems.length; i++) {
        imageItems[i].classList.remove("active");
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

  onImageOver(index, e) {
    const { activeProjectID } = this.state;
    const newTexture = this.props.projects[activeProjectID].field_images[index].url;
    this.setState({ currentTexture: newTexture });
  }

  onImageClick(index, e) {
    const { activeProjectID } = this.state;
    this.props.toggleCarousel(activeProjectID, index);
  }

  render() {
    const { isProjectActive, activeProjectID } = this.state;

    if (isProjectActive) {
      return (
        <div
          className="project-info"
          ref={(mount) => {
            this.mount = mount;
          }}
        >
          <article className="project-text">
            <h2>{this.props.projects[activeProjectID].title[0].value}</h2>
            <ul className="tools">
              {this.props.projects[activeProjectID].field_tools.map(
                (tool, i) => (
                  <li key={i}>{tool.value}</li>
                )
              )}
            </ul>
            <span
              dangerouslySetInnerHTML={{
                __html: this.props.projects[activeProjectID].body[0].value,
              }}
            ></span>
          </article>
          <div className="project-images">
            {this.props.projects[activeProjectID].field_images.map(
              (image, i) => (
                <div
                  className="project-images-item"
                  key={i}
                  onClick={(e) => this.onImageClick(i, e)}
                  onMouseEnter={(e) => this.onImageOver(i, e)}
                >
                  <img src={image.url} alt="" />
                </div>
              )
            )}
          </div>
          <div className="project-controls">
            <div
              className="prev-button"
              onClick={(e) => this.onProjectPrevClick(e)}
            >
              <img src={left} alt="Previous Project" />
            </div>
            <div
              className="close-button"
              onClick={(e) => this.onProjectCloseClick(e)}
            >
              <img src={close} alt="Close Project" />
            </div>
            <div
              className="next-button"
              onClick={(e) => this.onProjectNextClick(e)}
            >
              <img src={right} alt="Next Project" />
            </div>
          </div>
          <div className="project-extra">
            {activeProjectID + 1 + " of " + this.props.projects.length}
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
