import React from "react";
import gsap from "gsap/all";
import ThreeProjectsCanvas from "./three/ThreeProjectsCanvas";
import GradientGenerator from "./utils/GradientGenerator";
import "./ProjectGrid.scss";

import left from "..//images/angle-left.svg";
import right from "../images/angle-right.svg";
import close from "../images/window-close.svg";

class ProjectGrid extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isProjectActive: false,
      activeProjectID: null,
    };
  }

  componentDidMount() {
    this.threeCanvas = new ThreeProjectsCanvas(
      this.props.threeContainer.offsetWidth,
      this.props.threeContainer.offsetHeight
    );
    this.props.threeContainer.appendChild(this.threeCanvas.renderer.domElement);
  }

  componentDidUpdate() {
    const { isProjectActive, activeProjectID } = this.state;

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

    this.threeCanvas.onResize();
    if (isProjectActive) {
      if (
        this.props.projects[activeProjectID].field_videos.length > 0 &&
        window.innerWidth > 600
      ) {
        let projectVideo =
          this.props.projects[activeProjectID].field_videos[
            Math.floor(
              Math.random() *
                this.props.projects[activeProjectID].field_videos.length
            )
          ].url;
        this.threeCanvas.changeVideo(projectVideo);
      } else {
        this.threeCanvas.changeVideo(null);
      }
      this.threeCanvas.addProject(
        this.props.projects[activeProjectID].field_images[0].url
      );

      let imageItems = this.mount.querySelectorAll(".project-images-item");
      for (let i = 0; i < imageItems.length; i++) {
        imageItems[i].classList.remove("active");
      }

      this.threeCanvas.doRender = true;
      gsap.to(this.props.threeContainer, {
        alpha: 1,
        duration: 0.5,
        delay: 0.3,
      });
    } else {
      this.threeCanvas.doRender = false;
      gsap.set(this.props.threeContainer, {
        alpha: 0,
        duration: 0.5,
      });
    }
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
    this.threeCanvas.addProject(
      this.props.projects[activeProjectID].field_images[index].url
    );
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
