import React from "react";
import { gsap, ScrollTrigger } from "gsap/all";
import "./LogoGrid.scss";
import HeaderIcon from "./HeaderIcon";

import jamba from "../images/logos/jamba.svg";
import walmart from "../images/logos/walmart.svg";
import microsoft from "../images/logos/microsoft.svg";
import churchs from "../images/logos/churchs.svg";
import jimmyjohns from "../images/logos/jimmyjohns.svg";
import monrovia from "../images/logos/monrovia.svg";
import subway from "../images/logos/subway.svg";
import vive from "../images/logos/vive.svg";
import juniper from "../images/logos/juniper.svg";
import sovos from "../images/logos/sovos.png";
import redrobin from "../images/logos/redrobin.svg";
import deltadental from "../images/logos/deltadental.svg";
import rocky from "../images/logos/rocky.svg";
import atlassian from "../images/logos/atlassian.svg";
import gap from "../images/logos/gap.svg";
import att from "../images/logos/att.svg";
// import winc from "../images/logos/winc.svg";

class LogoGrid extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      logos: [
        jamba,
        walmart,
        microsoft,
        churchs,
        jimmyjohns,
        monrovia,
        subway,
        gap,
        att,
        juniper,
        vive,
        sovos,
        redrobin,
        deltadental,
        rocky,
        atlassian
      ],
    };
  }

  componentDidMount() {
    this.logosTl = this.buildLogosTimeline();

    ScrollTrigger.create({
      trigger: this.mount,
      start: "top bottom",
      end: "top center",
      scrub: 1,
      animation: this.logosTl,
    });
  }

  componentWillUnmount() {
    if (this.logosTl) this.logosTl.kill();
  }

  buildLogosTimeline() {
    const tl = gsap.timeline({ paused: true });

    tl.fromTo(this.mount, { alpha: 0 }, { alpha: 1, duration: 1, ease: "quad.inOut" });
    tl.fromTo(
      this.mount.querySelectorAll(".logo-grid-item"),
      { alpha: 0, y: 100 },
      {
        duration: 0.5,
        alpha: 1,
        y: 0,
        stagger: { amount: 1, grid: "auto", from: "start" },
        ease: "back.out",
      },
      0
    );

    return tl;
  }

  logoOver(e) {
    gsap.fromTo(
      e.currentTarget,
      {
        rotationY: 0,
      },
      {
        rotationY: 90,
        duration: 0.2,
        yoyo: true,
        repeat: 1,
        ease: "quad.inOut",
      }
    );
  }

  render() {
    return (
      <section
        className="logo-grid container"
        ref={(mount) => {
          this.mount = mount;
        }}
      >
        <div className="column">
          <h3>Brands <HeaderIcon /></h3>
          <div className="logo-grid-container">
            {this.state.logos.map((logo, i) => (
              <div className="logo-grid-item" key={i}>
                <img src={logo} alt="Logo" onMouseEnter={this.logoOver} />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }
}

export default LogoGrid;
