import React from "react";
import { gsap, MotionPathPlugin } from "gsap/all";
import tinycolor from "tinycolor2";
import "./AnimatedOverlay.scss";

class AnimatedOverlay extends React.Component {
  constructor(props) {
    super(props);
    this.mount = React.createRef();
    this.state = { bubbles: props.particles };
    gsap.registerPlugin(MotionPathPlugin);
  }

  componentDidMount() {
    gsap.set(this.mount.current, {
      height: 300 + (this.props.size * 100) + "vh"
    });

    this.mountTl = gsap.timeline({
      scrollTrigger: {
        trigger: document.body,
        start: "top top",
        end: "bottom bottom",
        scrub: 2,
      },
    });

    this.mountTl.to(this.mount.current, {
      bottom: 0,
      ease: "quad.inOut",
      duration: 10,
    });

    this.particleTl = gsap.timeline({
      scrollTrigger: {
        trigger: document.body,
        start: "top top",
        end: "bottom bottom",
        scrub: 2,
      },
    });

    for (let i = 0; i < this.state.bubbles; i++) {
      let bubble = document.createElement("div");
      bubble.className = "bubble";
      this.mount.current.appendChild(bubble);

      let startX = this.randomX();
      let startY = this.randomY();

      gsap.set(bubble, {
        x: startX,
        y: startY,
        scale: 0,
        background:
          "linear-gradient(" +
          Math.round(Math.random() * 360) +
          "deg, " +
          tinycolor("#CCFF00")
            .spin(Math.random() * 360)
            .toHexString() +
          ", " +
          tinycolor("#CCFF00")
            .spin(Math.random() * 360)
            .toHexString() +
          ")",
      });

      let newScale = 0.15 + Math.random() * 0.4;
      let xRange = 600;
      let yRange = 300;

      let path = [];
      for (let i = 0; i < 2; i++) {
        let xMod = xRange * (newScale * 2.5);
        let yMod = yRange * (newScale * 2.5);
        let newX = startX + (-(xMod / 2) + Math.random() * xMod);
        let newY = startY + (-(yMod / 2) + Math.random() * yMod);
        const coords = {
          x: newX,
          y: newY,
        };
        path.push(coords);
      }

      this.particleTl.to(
        bubble,
        {
          duration: 2 + Math.random() * 10,
          motionPath: {
            path: path,
          },
          scale: newScale,
          rotation: Math.random() * 360,
          yoyo: true,
          repeat: 1,
          ease: "quad.inOut",
        },
        0 + Math.random() * 10
      );
    }
  }

  randomX() {
    return (
      -500 +
      Math.random() * this.mount.current.getBoundingClientRect().width +
      500
    );
  }

  randomY() {
    return (
      -250 +
      Math.random() * this.mount.current.getBoundingClientRect().height +
      500
    );
  }

  render() {
    return (
      <div className="animated-overlay" ref={this.mount}></div>
    );
  }
}

export default AnimatedOverlay;
