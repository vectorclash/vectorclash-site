import { useRef, useEffect, useMemo, useState } from "react";
import { gsap, ScrollTrigger } from "gsap/all";
import ProjectGrid from "./ProjectGrid";
import HeaderIcon from "./HeaderIcon";
import "./Projects.scss";
import projectsData from "../data/projects.json";

function Projects() {
  const mountRef = useRef(null);
  const threeContainerRef = useRef(null);
  const projects = useMemo(() => gsap.utils.shuffle(projectsData.filter(p => !p.disabled)), []);
  const [isProjectActive, setIsProjectActive] = useState(false);

  useEffect(() => {
    const tl = gsap.timeline({ paused: true });

    tl.fromTo(mountRef.current, { alpha: 0 }, { duration: 1, alpha: 1, ease: "quad.inOut" })
      .fromTo(
        mountRef.current.querySelectorAll("li"),
        { alpha: 0 },
        { duration: 1, alpha: 1, ease: "bounce.out", stagger: { amount: 0.5 } },
        0.5
      );

    const st = ScrollTrigger.create({
      trigger: mountRef.current,
      start: "top bottom",
      end: "top top",
      scrub: 1,
      animation: tl,
    });

    return () => {
      st.kill();
      tl.kill();
    };
  }, []);

  return (
    <section className={`container projects ${isProjectActive ? 'project-open' : ''}`} ref={mountRef}>
      <div className="project-three-container" ref={threeContainerRef}></div>
      <div className="column">
        <h3>Projects <HeaderIcon /></h3>
        <ProjectGrid
          projects={projects}
          threeContainerRef={threeContainerRef}
          onProjectActiveChange={setIsProjectActive}
        />
      </div>
    </section>
  );
}

export default Projects;
