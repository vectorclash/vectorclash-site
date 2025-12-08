import { useRef, useEffect } from "react";
import { gsap, MotionPathPlugin } from "gsap/all";
import tinycolor from "tinycolor2";
import "./AnimatedOverlay.scss";

function AnimatedOverlay({ particles, size }) {
  const mountRef = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(MotionPathPlugin);

    gsap.set(mountRef.current, {
      height: 300 + (size * 100) + "vh"
    });

    const mountTl = gsap.timeline({
      scrollTrigger: {
        trigger: document.body,
        start: "top top",
        end: "bottom bottom",
        scrub: 2,
      },
    });

    mountTl.to(mountRef.current, {
      bottom: 0,
      ease: "quad.inOut",
      duration: 10,
    });

    const particleTl = gsap.timeline({
      scrollTrigger: {
        trigger: document.body,
        start: "top top",
        end: "bottom bottom",
        scrub: 2,
      },
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
        -250 +
        Math.random() * mountRef.current.getBoundingClientRect().height +
        500
      );
    };

    // Create bubbles
    for (let i = 0; i < particles; i++) {
      const bubble = document.createElement("div");
      bubble.className = "bubble";
      mountRef.current.appendChild(bubble);

      const startX = randomX();
      const startY = randomY();

      gsap.set(bubble, {
        x: startX,
        y: startY,
        scale: 0,
        background: `linear-gradient(${Math.round(Math.random() * 360)}deg, ${tinycolor("#CCFF00").spin(Math.random() * 360).toHexString()}, ${tinycolor("#CCFF00").spin(Math.random() * 360).toHexString()})`,
      });

      const newScale = 0.15 + Math.random() * 0.4;
      const xRange = 600;
      const yRange = 300;

      const path = [];
      for (let j = 0; j < 2; j++) {
        const xMod = xRange * (newScale * 2.5);
        const yMod = yRange * (newScale * 2.5);
        const newX = startX + (-(xMod / 2) + Math.random() * xMod);
        const newY = startY + (-(yMod / 2) + Math.random() * yMod);
        path.push({ x: newX, y: newY });
      }

      particleTl.to(
        bubble,
        {
          duration: 2 + Math.random() * 10,
          motionPath: { path },
          scale: newScale,
          rotation: Math.random() * 360,
          yoyo: true,
          repeat: 1,
          ease: "quad.inOut",
        },
        0 + Math.random() * 10
      );
    }

    return () => {
      // Cleanup: kill timelines
      mountTl.kill();
      particleTl.kill();
    };
  }, [particles, size]);

  return <div className="animated-overlay" ref={mountRef}></div>;
}

export default AnimatedOverlay;
