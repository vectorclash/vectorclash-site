import React from "react";
import tinycolor from "tinycolor2";
import { gsap, DrawSVGPlugin } from "gsap/all";

import "./Logo.scss";

class Logo extends React.Component {
  constructor() {
    super();
    this.animateRef = this.animateLogo.bind(this);
  }

  componentDidMount() {
    gsap.registerPlugin(DrawSVGPlugin);
    gsap.delayedCall(1, this.animateRef);
  }

  resetLogo() {
    let lines = this.mount.querySelectorAll("line");
    for (let i = 0; i < lines.length; i++) {
      lines[i].style.stroke = "#FFFFFF";
    }
  }

  animateLogo() {
    let lines = this.mount.querySelectorAll("line");
    let mainColor = tinycolor("#CCFF00").spin(Math.random() * 360);

    for (let i = 0; i < lines.length; i++) {
      let alphaChance = Math.random();

      if (alphaChance > 0.4) {
        let colorChance = Math.random();

        if (colorChance > 0.8) {
          lines[i].style.stroke = mainColor
            .spin(-15 + Math.random() * 30)
            .toHexString();
        } else {
          let ranGreyscale = 100 + Math.random() * 155;
          lines[i].style.stroke = tinycolor({
            r: ranGreyscale,
            g: ranGreyscale,
            b: ranGreyscale,
          }).toHexString();
        }

        gsap.from(lines[i], {
          duration: 0.5,
          drawSVG: "0%",
          delay: i * 0.02,
          ease: "quad.inOut",
        });
      } else {
        lines[i].style.stroke = "none";
      }
    }

    gsap.to(this.mount, {
      duration: 0.2,
      scale: 0.95,
      yoyo: true,
      repeat: 1,
      ease: "quad.out",
    });

    gsap.delayedCall(4 + Math.random() * 11, () => {
      this.resetLogo();
      this.animateLogo();
    });
  }

  render() {
    return (
      <div
        className="logo"
        ref={(mount) => {
          this.mount = mount;
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 313.4 303.4">
          <line x1="306" y1="252" x2="306" y2="108" />
          <line x1="180" y1="36" x2="306" y2="108" />
          <line x1="54" y1="108" x2="180" y2="36" />
          <line x1="54" y1="252" x2="54" y2="108" />
          <line x1="306" y1="252" x2="180" y2="324" />
          <line x1="54" y1="252" x2="180" y2="324" />
          <line x1="180" y1="36" x2="180" y2="324" />
          <line x1="306" y1="108" x2="54" y2="252" />
          <line x1="306" y1="252" x2="54" y2="108" />
          <line x1="180" y1="36" x2="243" y2="144" />
          <line x1="243" y1="216" x2="243" y2="144" />
          <line x1="180" y1="36" x2="117" y2="144" />
          <line x1="243" y1="216" x2="180" y2="252" />
          <line x1="117" y1="144" x2="117" y2="216" />
          <line x1="180" y1="252" x2="117" y2="216" />
          <line x1="243" y1="144" x2="180" y2="108" />
          <line x1="117" y1="144" x2="180" y2="108" />
          <line x1="117" y1="216" x2="180" y2="324" />
          <line x1="243" y1="216" x2="180" y2="324" />
          <line x1="180" y1="108" x2="54" y2="108" />
          <line x1="306" y1="108" x2="180" y2="108" />
          <line x1="306" y1="252" x2="180" y2="252" />
          <line x1="54" y1="252" x2="180" y2="252" />
          <line x1="117" y1="216" x2="54" y2="108" />
          <line x1="54" y1="252" x2="117" y2="144" />
          <line x1="306" y1="108" x2="243" y2="216" />
          <line x1="306" y1="252" x2="243" y2="144" />
          <line x1="180" y1="324" x2="243" y2="144" />
          <line x1="117" y1="144" x2="180" y2="324" />
          <line x1="180" y1="36" x2="117" y2="216" />
          <line x1="243" y1="216" x2="180" y2="36" />
          <line x1="306" y1="252" x2="117" y2="216" />
          <line x1="180" y1="108" x2="306" y2="252" />
          <line x1="306" y1="108" x2="117" y2="144" />
          <line x1="180" y1="252" x2="306" y2="108" />
          <line x1="54" y1="108" x2="243" y2="144" />
          <line x1="54" y1="252" x2="243" y2="216" />
          <line x1="180" y1="108" x2="54" y2="252" />
          <line x1="54" y1="108" x2="180" y2="252" />
          <path
            d="M180,36c38.5,0,74.6,15,101.8,42.2S324,141.5,324,180s-15,74.6-42.2,101.8S218.5,324,180,324s-74.6-15-101.8-42.2
            S36,218.5,36,180s15-74.6,42.2-101.8S141.5,36,180,36 M180,34C99.4,34,34,99.4,34,180s65.4,146,146,146s146-65.4,146-146
            S260.6,34,180,34L180,34z"
          />
        </svg>
      </div>
    );
  }
}

export default Logo;
