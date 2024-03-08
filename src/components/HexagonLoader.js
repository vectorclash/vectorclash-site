import React from "react";
import tinycolor from "tinycolor2";
import { gsap, DrawSVGPlugin } from "gsap/all";
import "./HexagonLoader.scss";

class HexagonLoader extends React.Component {
  constructor(props) {
    super(props);
    this.mount = React.createRef();
  }

  componentDidMount() {
    gsap.registerPlugin(DrawSVGPlugin);
    this.animateHexagon();
  }

  animateHexagon() {
    if (this.mount.current) {
      let glow = this.mount.current.querySelectorAll(".hexagon-glow");
      gsap.set(glow, {
        background:
          "linear-gradient( 42deg, " +
          tinycolor("#CCFF00")
            .spin(Math.random() * 360)
            .toHexString() +
          ", " +
          tinycolor("#CCFF00")
            .spin(Math.random() * 360)
            .toHexString() +
          ", " +
          tinycolor("#CCFF00")
            .spin(Math.random() * 360)
            .toHexString() +
          ")",
      });

      gsap.fromTo(
        glow,
        {
          opacity: 0,
          scale: 0.5,
        },
        {
          duration: 1,
          opacity: 1,
          scale: 1,
          yoyo: true,
          repeat: 1,
          ease: "quad.inOut",
        }
      );

      let polygons = this.mount.current.querySelectorAll("polygon");
      for (var i = 0; i < polygons.length; i++) {
        let ranChance = Math.random();
        if (ranChance > 0.7) {
          gsap.fromTo(
            polygons[i],
            {
              drawSVG: "0%",
              strokeWidth: 0,
            },
            {
              duration: 1,
              drawSVG: "100%",
              strokeWidth: 10,
              stroke: tinycolor("#CCFF00")
                .spin(i * 25)
                .toHexString(),
              ease: "quad.inOut",
            }
          );

          gsap.fromTo(
            polygons[i],
            {
              drawSVG: "100% 0%",
            },
            {
              duration: 1,
              drawSVG: "100% 100%",
              strokeWidth: 0,
              stroke: tinycolor("#CCFF00")
                .spin(Math.random() * 360)
                .toHexString(),
              ease: "quad.inOut",
              delay: 1,
            }
          );
        } else {
          gsap.fromTo(
            polygons[i],
            {
              drawSVG: "100% 100%",
              strokeWidth: 0,
            },
            {
              duration: 1,
              drawSVG: "100% 0%",
              strokeWidth: 10,
              stroke: tinycolor("#CCFF00")
                .spin(i * 40)
                .toHexString(),
              ease: "quad.inOut",
            }
          );

          gsap.fromTo(
            polygons[i],
            {
              drawSVG: "100% 0%",
            },
            {
              duration: 1,
              drawSVG: "0% 0%",
              strokeWidth: 0,
              stroke: tinycolor("#CCFF00")
                .spin(Math.random() * 360)
                .toHexString(),
              ease: "quad.inOut",
              delay: 1,
            }
          );
        }
      }
      gsap.delayedCall(2, this.animateHexagon.bind(this));
    }
  }

  render() {
    return (
      <div
        className="hexagon-loader"
        ref={this.mount}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
          <polygon points="300,228 363,264 363,336 300,372 237,336 237,264 " />
          <polygon points="300,220.8 369.3,260.4 369.3,339.6 300,379.2 230.7,339.6 230.7,260.4 " />
          <polygon points="300,212.9 376.2,256.4 376.2,343.6 300,387.1 223.8,343.6 223.8,256.4 " />
          <polygon points="300,204.2 383.9,252.1 383.9,347.9 300,395.8 216.1,347.9 216.1,252.1 " />
          <polygon points="300,194.6 392.2,247.3 392.2,352.7 300,405.4 207.8,352.7 207.8,247.3 " />
          <polygon points="300,184 401.5,242 401.5,358 300,416 198.5,358 198.5,242 " />
          <polygon points="300,172.4 411.6,236.2 411.6,363.8 300,427.6 188.4,363.8 188.4,236.2 " />
          <polygon points="300,159.7 422.8,229.8 422.8,370.2 300,440.3 177.2,370.2 177.2,229.8 " />
          <polygon points="300,145.7 435,222.8 435,377.2 300,454.3 165,377.2 165,222.8 " />
          <polygon points="300,130.2 448.6,215.1 448.6,384.9 300,469.8 151.4,384.9 151.4,215.1 " />
          <polygon points="300,113.3 463.4,206.6 463.4,393.4 300,486.7 136.6,393.4 136.6,206.6 " />
          <polygon points="300,94.6 479.7,197.3 479.7,402.7 300,505.4 120.3,402.7 120.3,197.3 " />
          <polygon points="300,74 497.7,187 497.7,413 300,526 102.3,413 102.3,187 " />
          <polygon points="300,51.4 517.5,175.7 517.5,424.3 300,548.6 82.5,424.3 82.5,175.7 " />
          <polygon points="300,26.6 539.2,163.3 539.2,436.7 300,573.4 60.8,436.7 60.8,163.3 " />
          <polygon points="300,-0.8 563.2,149.6 563.2,450.4 300,600.8 36.8,450.4 36.8,149.6 " />
        </svg>
        <div className="hexagon-glow"></div>
      </div>
    );
  }
}

export default HexagonLoader;
