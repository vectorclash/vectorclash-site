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
              <p>As a creative coder and motion engineer, I find a profound connection between coding and the artistry of animation. Crafting banner ads as well as delving into motion graphics with After Effects are part of my daily exploration, yet my true passion lies in how code can animate and bring static concepts to dynamic life. There's an intriguing balance between technical precision and creative expression, particularly when venturing into 3D animation with Blender, where the limitless potential of digital environments captivates my imagination.</p>
              <p>On the design front, Figma is my tool of choice for its seamless interface and the collaborative freedom it offers. It's not just about creating visually appealing designs but also about ensuring they resonate on a functional level. Whether it's through UI/UX design, animation, or coding, the journey from concept to execution is what I find most rewarding. It's about crafting experiences that are not only innovative but also intuitive.</p>
              <p>Ultimately, what I enjoy most is the synergy between these diverse skills. It's a multidisciplinary approach that allows me to not only conceptualize but also bring these ideas to life in a way that is both technically sound and aesthetically compelling. From the intricacies of HTML/CSS/JavaScript to the creative prowess needed for effective design and animation, it's this fusion of technology and art that defines my work.</p>
              <p>
                <a href="./banners/" style={{ textDecoration: "underline" }}>
                  HTML5 Banner Portfolio
                </a>
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
