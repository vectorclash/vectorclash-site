import React from "react";
import { gsap, SplitText, ScrollTrigger } from "gsap/all";
import "./About.scss";
import me from "../images/me.png";
import HeaderIcon from "./HeaderIcon";
import skillsData from "../data/skills.json";

class About extends React.Component {
  constructor(props) {
    super(props);
    this.mount = React.createRef();
    this.state = {
      skills: skillsData,
    };
    this.meMounted = false;
  }

  componentDidMount() {
    this.skillContainer = this.mount.current.querySelector(".skills");
    this.aboutContainer = this.mount.current.querySelector(".about-text");

    document.fonts.ready.then(() => {
      this.skillsTl = this.buildSkillsTimeline();
      this.aboutTl = this.buildAboutTimeline();

      ScrollTrigger.create({
        trigger: this.skillContainer,
        start: "top bottom",
        end: "top top",
        scrub: 1,
        animation: this.skillsTl,
      });

      ScrollTrigger.create({
        trigger: this.aboutContainer,
        start: "top bottom",
        end: "top top",
        scrub: 1,
        animation: this.aboutTl,
        onEnter: () => {
          if (!this.meMounted) {
            this.meMounted = true;
            this.animateMe();
          }
        },
      });
    });
  }

  componentWillUnmount() {
    if (this.skillsTl) this.skillsTl.kill();
    if (this.aboutTl) this.aboutTl.kill();
    gsap.killTweensOf(".geometric-me");
  }

  buildSkillsTimeline() {
    const tl = gsap.timeline({ paused: true });

    tl.fromTo(this.skillContainer, { alpha: 0 }, { alpha: 1, duration: 1, ease: "quad.inOut" });

    const groups = this.skillContainer.querySelectorAll(".skill-group");
    groups.forEach((group, i) => {
      const pos = 0.5 + i * 0.3;
      tl.fromTo(
        group.querySelector(".skill-category"),
        { alpha: 0, y: 10 },
        { duration: 0.5, alpha: 1, y: 0, ease: "quad.out" },
        pos
      );
      tl.fromTo(
        group.querySelectorAll("li"),
        { alpha: 0, y: 8, scale: 0.9 },
        {
          duration: 0.5,
          alpha: 1,
          y: 0,
          scale: 1,
          ease: "back.out",
          stagger: { amount: 0.25 },
        },
        pos + 0.15
      );
    });

    return tl;
  }

  buildAboutTimeline() {
    const tl = gsap.timeline({ paused: true });

    tl.fromTo(this.aboutContainer, { alpha: 0 }, { alpha: 1, duration: 1, ease: "quad.inOut" });

    const aboutSplit = new SplitText(this.aboutContainer.querySelectorAll("p"), { type: "lines" });
    tl.from(aboutSplit.lines, {
      duration: 0.5,
      y: 10,
      alpha: 0,
      ease: "back.out",
      stagger: { amount: 1 },
    }, 0.5);

    return tl;
  }

  animateMe() {
    let parent = this.mount.current.querySelector(".about-text");
    gsap.to(".geometric-me", {
      duration: 5 + Math.random() * 10,
      x: Math.random() * parent.clientWidth,
      y: Math.random() * parent.clientHeight,
      alpha: Math.random() * 0.4,
      ease: "quad.inOut",
      onComplete: this.animateMe.bind(this),
    });
  }

  render() {
    return (
      <section className="about container" ref={this.mount}>
        <div className="column">
          <article className="skills">
            <h3>Skills <HeaderIcon /></h3>
            {this.state.skills.map((skillGroup) => (
              <div
                key={skillGroup.category}
                className={
                  "skill-group" + (skillGroup.secondary ? " skill-group-secondary" : "")
                }
              >
                <h4 className="skill-category">{skillGroup.category}</h4>
                <ul className="skill-list">
                  {skillGroup.items.map((skill) => (
                    <li key={skill}>{skill}</li>
                  ))}
                </ul>
              </div>
            ))}
          </article>
          <article className="about-text">
            <h3>What I do <HeaderIcon /></h3>
            <div>
              <p>I am a design engineer working at the seam between interface design and the code that makes it move. Over the past decade I have built interactive and animated work for Microsoft, Walmart, Atlassian, Gap, AT&amp;T, HTC Vive, and Subway &mdash; a permanent touch installation in Gap's San Francisco headquarters at one end of that range, an audio-reactive projection system for a live dancefloor at the other. The common thread is motion that carries meaning rather than motion applied as decoration.</p>
              <p>Motion graphics runs alongside the interface work. For AT&amp;T I produced animated banners and social video at campaign volume &mdash; GSAP and Adobe Animate for the interactive units, After Effects for the video &mdash; and built the automation that took the resizing and exporting over. It is still part of what I do: Chromaforge, my own app, renders its own promotional video in the browser rather than in After Effects.</p>
              <p>Most of my work lives in the browser, in React and GSAP, and increasingly three.js when an idea calls for real-time 3D. I care about the engineering underneath the surface: the 3D scenes here scale their effects to the visitor's GPU, and the scroll choreography survives a mobile address bar collapsing mid-gesture. The other half of the practice is design proper &mdash; Figma, and a long-running interest in color as a system rather than a palette, which is where Chromaforge came from. It has since grown into a print-on-demand product with real users.</p>
              <p>
                A selection of the banner work is collected separately:{" "}
                <a href="./banners/" style={{ textDecoration: "underline" }}>
                  HTML5 Banner Portfolio
                </a>
                .
              </p>
            </div>
            <img src={me} className="geometric-me" alt="" aria-hidden="true" />
          </article>
        </div>
      </section>
    );
  }
}

export default About;
