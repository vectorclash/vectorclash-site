import React from "react";
import { gsap, ScrollTrigger } from "gsap/all";
import HexagonLoader from "./HexagonLoader";
import ProjectGrid from "./ProjectGrid";
import ImageCarousel from "./ImageCarousel";
import "./Projects.scss";

class Projects extends React.Component {
  constructor(props) {
    super(props);
    this.mount = React.createRef();

    this.state = {
      error: null,
      isLoaded: false,
      projects: [],
      showCarousel: false,
      setShowCarousel: false,
      carouselImages: [],
      activeCarouselImage: null
    };

    this.toggleCarousel = this.toggleCarousel.bind(this);
  }

  componentDidMount() {
    fetch("https://www.vectorclash.com/data/projects?_format=json")
      .then((res) => res.json())
      .then(
        (data) => {
          this.setState({
            isLoaded: true,
            projects: gsap.utils.shuffle(data),
          });
        },
        (error) => {
          this.setState({
            isLoaded: true,
            error,
          });
        }
      );

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

  toggleCarousel(projectIndex, imageIndex) {
    if(projectIndex !== null && imageIndex !== null) {
      this.setState({
        carouselImages: this.state.projects[projectIndex].field_images,
        activeCarouselImage: imageIndex
      });
    }

    this.setState((prevState) => ({
      showCarousel: !prevState.showCarousel,
    }))
  }

  render() {
    const { error, isLoaded, projects, showCarousel } = this.state;

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
              toggleCarousel={this.toggleCarousel}
            />
          </div>
          {showCarousel && (
            <ImageCarousel
              toggleCarousel={this.toggleCarousel}
              carouselImages={this.state.carouselImages}
              activeCarouselImage={this.state.activeCarouselImage}
            />
          )}
        </section>
      );
    }
  }
}

export default Projects;
