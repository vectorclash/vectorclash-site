import { useRef, useEffect } from "react";
import { gsap, MotionPathPlugin } from "gsap/all";
import tinycolor from "tinycolor2";
import "./AnimatedParticles.scss";

function AnimatedParticles({ count }) {
  const mountRef = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(MotionPathPlugin);

    const mountTl = gsap.timeline({
      scrollTrigger: {
        trigger: mountRef.current,
        start: "top bottom+=500px",
        end: "bottom bottom+=500px",
        scrub: 2
      },
    });

    mountTl.fromTo(mountRef.current, {
      top: 500,
    }, {
      top: 0,
      ease: "quad.out",
      duration: 10,
    });

    const randomX = () => {
      return (
        -500 +
        Math.random() * mountRef.current.getBoundingClientRect().width +
        500
      );
    };

    const randomY = () => {
      return (
        -500 +
        Math.random() * mountRef.current.getBoundingClientRect().height +
        500
      );
    };

    const moveParticle = (particle) => {
      const ranTime = 5 + Math.random() * 50;
      const newScale = 0.01 + Math.random() * 0.25;

      const path = [];
      for (let i = 0; i < 2; i++) {
        path.push({
          x: randomX(),
          y: randomY(),
        });
      }

      gsap.to(particle, {
        duration: ranTime,
        motionPath: { path },
        scale: newScale,
        rotation: Math.random() * 360,
        ease: "quad.inOut",
        onComplete: () => moveParticle(particle),
      });
    };

    for (let i = 0; i < count; i++) {
      const particle = document.createElement("div");
      particle.className = "particle";
      mountRef.current.appendChild(particle);

      const startX = randomX();
      const startY = randomY();

      gsap.set(particle, {
        x: startX,
        y: startY,
        scale: 0.01 + Math.random() * 0.25,
        background: `linear-gradient(${Math.round(Math.random() * 360)}deg, ${tinycolor("#CCFF00").spin(Math.random() * 360).toHexString()}, ${tinycolor("#CCFF00").spin(Math.random() * 360).toHexString()})`,
      });

      moveParticle(particle);
    }

    return () => {
      gsap.killTweensOf(".particle");
      mountTl.kill();
    };
  }, [count]);

  return <div className="animated-particles" ref={mountRef}></div>;
}

export default AnimatedParticles;
