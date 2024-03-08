import React from "react";
import { gsap, MotionPathPlugin } from "gsap/all";
import tinycolor from "tinycolor2";
import "./AnimatedParticles.scss";

class AnimatedParticles extends React.Component {
  constructor(props) {
    super(props);
    this.mount = React.createRef();
    this.state = { bubbles: props.particles };
    gsap.registerPlugin(MotionPathPlugin);
  }

  componentDidMount() {
    this.mountTl = gsap.timeline({
      scrollTrigger: {
        trigger: this.mount.current,
        start: "top bottom+=500px",
        end: "bottom bottom+=500px",
        scrub: 2
      },
    });

    this.mountTl.fromTo(this.mount.current, {
      top: 500,
    }, {
      top: 0,
      ease: "quad.out",
      duration: 10,
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
        scale: 0.01 + Math.random() * 0.25,
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

      this.moveParticle(bubble);
    }
  }

  componentWillUnmount() {
    gsap.killTweensOf(".bubble");
  }

  moveParticle(particle) {
    let ranTime = 5 + Math.random() * 50;
    let newScale = 0.01 + Math.random() * 0.25;

    let path = [];
    for (let i = 0; i < 2; i++) {
      const coords = {
        x: this.randomX(),
        y: this.randomY(),
      };
      path.push(coords);
    }

    gsap.to(particle, {
      duration: ranTime,
      motionPath: {
        path: path,
      },
      scale: newScale,
      rotation: Math.random() * 360,
      ease: "quad.inOut",
      onComplete: this.moveParticle.bind(this),
      onCompleteParams: [particle],
    });
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
      -500 +
      Math.random() * this.mount.current.getBoundingClientRect().height +
      500
    );
  }

  render() {
    return <div className="animated-particles" ref={this.mount}></div>;
  }
}

export default AnimatedParticles;