import { useRef, useEffect } from "react";
import gsap from "gsap/all";
import GradientGenerator from "./utils/GradientGenerator";
import "./GradientBackground.scss";

function GradientBackground() {
  const mountRef = useRef(null);

  useEffect(() => {
    const chooseColors = () => {
      let colorAmount = 3;
      const randomChance = Math.random();
      let colorRandom = false;

      if (randomChance > 0.5) {
        colorRandom = false;
        colorAmount += Math.round(Math.random() * 3);
      }

      const colors = new GradientGenerator(colorAmount, colorRandom).colors;
      updateColors(colors);
    };

    const updateColors = (colors) => {
      let gradientString = "linear-gradient(42deg, ";

      for (let i = 0; i < colors.length; i++) {
        gradientString += colors[i].toHexString();
        if (i < colors.length - 1) {
          gradientString += ", ";
        } else {
          gradientString += ")";
        }
      }

      const gradient = document.createElement('div');
      gradient.classList.add('gradient');
      gradient.style.backgroundImage = gradientString;

      // Fade out existing gradients
      for (let i = 0; i < mountRef.current.children.length; i++) {
        const element = mountRef.current.children[i];
        gsap.fromTo(
          element,
          { alpha: 1 },
          {
            alpha: 0,
            duration: 5,
            ease: "quad.inOut",
            onComplete: () => {
              if (mountRef.current && mountRef.current.contains(element)) {
                mountRef.current.removeChild(element);
              }
            }
          }
        );
      }

      mountRef.current.prepend(gradient);
      gsap.delayedCall(5 + Math.random() * 10, chooseColors);
    };

    // Start the animation cycle
    chooseColors();

    return () => {
      // Cleanup: kill all delayed calls
      gsap.killTweensOf(mountRef.current);
      gsap.killDelayedCallsTo(chooseColors);
    };
  }, []);

  return <div className="gradient-background" ref={mountRef}></div>;
}

export default GradientBackground;
