import React from "react";
import { gsap, ScrollTrigger } from "gsap/all";
import HexagonLoader from "./HexagonLoader";
import ProjectGrid from "./ProjectGrid";
import "./Projects.scss";
import projectsData from "../data/projects.json";

class Projects extends React.Component {
  constructor(props) {
    super(props);
    this.mount = React.createRef();

    this.state = {
      error: null,
      isLoaded: false,
      projects: []
    };
  }

  componentDidMount() {
    // Load projects from local JSON data
    this.setState({
      isLoaded: true,
      projects: gsap.utils.shuffle(projectsData),
    });

    ScrollTrigger.create({
      trigger: this.mount.current,
      once: true,
      onEnter: () => {
        this.animateMount();
      },
    });
  }

  animateMount() {
    gsap.fromTo(this.mount.current, {
      alpha: 0
    }, {
      duration: 1,
      alpha: 1,
      ease: "quad.inOut",
    });

    gsap.fromTo(
      this.mount.current.querySelectorAll("li"),
      {
        alpha: 0,
      },
      {
        duration: 1,
        alpha: 1,
        ease: "bounce.out",
        stagger: {
          amount: 0.5,
        },
        delay: 0.5,
      }
    );
  }

  render() {
    const { error, isLoaded, projects } = this.state;

    if (error) {
      return (
        <section className="container projects" ref={this.mount}>
          <div className="column">
            <h2>
              PORTFOLIO IS CURRENTLY <strong>OFFLINE</strong>
            </h2>
          </div>
        </section>
      );
    } else if (!isLoaded) {
      return (
        <section className="container projects loading" ref={this.mount}>
          <div className="column">
            <HexagonLoader />
          </div>
        </section>
      );
    } else {
      return (
        <section className="container projects" ref={this.mount}>
          <div className="project-three-container"></div>
          <div className="column">
            <ProjectGrid
              projects={projects}
              threeContainer={this.mount.current.children[0]}
            />
          </div>
        </section>
      );
    }
  }
}

export default Projects;
