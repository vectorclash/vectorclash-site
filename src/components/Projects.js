import { useRef, useEffect, useMemo } from "react";
import { gsap, ScrollTrigger } from "gsap/all";
import ProjectGrid from "./ProjectGrid";
import HeaderIcon from "./HeaderIcon";
import "./Projects.scss";
import projectsData from "../data/projects.json";

function Projects() {
  const mountRef = useRef(null);
  const threeContainerRef = useRef(null);
  const projects = useMemo(() => gsap.utils.shuffle(projectsData), []);

  useEffect(() => {
    const animateMount = () => {
      gsap.fromTo(mountRef.current, {
        alpha: 0
      }, {
        duration: 1,
        alpha: 1,
        ease: "quad.inOut",
      });

      gsap.fromTo(
        mountRef.current.querySelectorAll("li"),
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
    };

    ScrollTrigger.create({
      trigger: mountRef.current,
      once: true,
      onEnter: animateMount,
    });
  }, []);

  return (
    <section className="container projects" ref={mountRef}>
      <div className="project-three-container" ref={threeContainerRef}></div>
      <div className="column">
        <h3>Projects <HeaderIcon /></h3>
        <ProjectGrid
          projects={projects}
          threeContainerRef={threeContainerRef}
        />
      </div>
    </section>
  );
}

export default Projects;
