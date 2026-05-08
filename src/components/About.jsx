import React from "react";
import { gsap, SplitText, ScrollTrigger } from "gsap/all";
import tinycolor from "tinycolor2";
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
  }

  componentDidMount() {
    this.skillContainer = this.mount.current.querySelector(".skills");
    ScrollTrigger.create({
      trigger: this.skillContainer,
      once: true,
      onEnter: () => {
        this.animateSkills();
      },
    });

    this.aboutContainer = this.mount.current.querySelector(".about-text");
    ScrollTrigger.create({
      trigger: this.aboutContainer,
      once: true,
      onEnter: () => {
        this.animateAbout();
      },
    });
  }

  animateElement(element, delay = 0) {
    gsap.fromTo(
      element,
      {
        alpha: 0,
      },
      {
        alpha: 1,
        duration: 1,
        ease: "quad.inOut",
        delay: delay,
        onComplete: this.animateMe.bind(this),
      }
    );
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

  animateSkills() {
    this.animateElement(this.skillContainer);

    // Animate category headers
    let categories = this.skillContainer.querySelectorAll(".skill-category");
    gsap.fromTo(
      categories,
      { alpha: 0, y: 10 },
      {
        duration: 0.5,
        alpha: 1,
        y: 0,
        stagger: 0.2,
        delay: 0.5,
      }
    );

    // Animate individual skills
    let skills = this.skillContainer.querySelectorAll("li");
    for (let i = 0; i < skills.length; i++) {
      const skill = skills[i];
      this.animateSkillIn(skill, 0.5 + i * 0.15);
    }
  }

  animateSkillIn(skill, delay) {
    gsap.fromTo(
      skill,
      {
        alpha: 0,
        y: 10,
      },
      {
        duration: 1,
        alpha: 1,
        y: 0,
        delay: delay,
      }
    );

    let mySize = skill.className.split("-")[2];

    gsap.fromTo(
      skill.querySelector(".skill-bar-front"),
      {
        width: "0%",
      },
      {
        duration: 1,
        width: mySize + "0%",
        ease: "bounce.out",
        delay: delay + 0.25
      }
    );

    gsap.fromTo(
      skill.querySelector(".skill-bar-back"),
      {
        alpha: 0,
      },
      {
        duration: 1,
        alpha: 1,
        ease: "bounce.out",
        delay: delay + 0.25,
      }
    );
  }

  animateAbout() {
    this.animateElement(this.aboutContainer);

    // Wait for fonts to load before using SplitText
    document.fonts.ready.then(() => {
      let aboutSplit = new SplitText(this.aboutContainer.querySelectorAll("p"), {
        type: "lines",
      });
      gsap.from(aboutSplit.lines, {
        duration: 0.5,
        y: 10,
        alpha: 0,
        ease: "back.out",
        stagger: {
          amount: 1,
        },
        delay: 0.5
      });
    });
  }

  onSkillOver(e) {
    let mySize = e.currentTarget.className.split("-")[2];
    let myHalfSize = Math.round(e.currentTarget.className.split("-")[2] / 2);

    gsap.fromTo(
      e.currentTarget.querySelector(".skill-bar-front"),
      {
        width: mySize + "0%",
      },
      {
        duration: 0.5,
        width: myHalfSize + "0%",
        yoyo: true,
        repeat: 1,
        ease: "quad.inOut",
        yoyoEase: "bounce.out",
      }
    );
  }

  render() {
    let colors = tinycolor("#CCFF00")
      .spin(Math.random() * 360)
      .tetrad();

    let gradientStringFull =
      "linear-gradient(42deg, " +
      colors[0].toHexString() +
      ", " +
      colors[1].toHexString() +
      ", " +
      colors[2].toHexString() +
      ", " +
      colors[3].toHexString() +
      ")";

    let gradientStringPartial =
      "linear-gradient(42deg, " +
      colors[0].toHexString() +
      ", " +
      colors[1].toHexString() +
      ", " +
      colors[2].toHexString() +
      ")";

    let gradientStringLow =
      "linear-gradient(42deg, " +
      colors[0].toHexString() +
      ", " +
      colors[1].toHexString() +
      ")";

    const barStyleFull = {
      backgroundImage: gradientStringFull,
    };
    const barStylePartial = {
      backgroundImage: gradientStringPartial,
    };
    const barStyleLow = {
      backgroundImage: gradientStringLow,
    };

    return (
      <section className="about container" ref={this.mount}>
        <div className="column">
          <article className="skills">
            <h3>Skills <HeaderIcon /></h3>
            {this.state.skills.map((skillGroup, groupIndex) => (
              <div key={groupIndex} className="skill-group">
                <h4 className="skill-category">{skillGroup.category}</h4>
                <ul className="skill-list">
                  {skillGroup.items.map((skill, skillIndex) => (
                    <li
                      className={"skill-level-" + skill.level}
                      key={`${groupIndex}-${skillIndex}`}
                      onMouseEnter={this.onSkillOver}
                    >
                      {skill.title}
                      <div className="skill-bar-back"></div>
                      <div
                        className="skill-bar-front"
                        style={
                          skill.level >= 9
                            ? barStyleFull
                            : skill.level >= 6
                            ? barStylePartial
                            : barStyleLow
                        }
                      ></div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </article>
          <article className="about-text">
            <h3>What I do <HeaderIcon /></h3>
            <div>
              <p>As a creative coder and motion engineer, I find a profound connection between coding and the artistry of animation. Crafting banner ads as well as delving into motion graphics with After Effects are part of my daily exploration, yet my true passion lies in how code can animate and bring static concepts to dynamic life. There’s an intriguing balance between technical precision and creative expression, particularly when venturing into 3D animation with Blender, where the limitless potential of digital environments captivates my imagination.</p>
              <p>On the design front, Figma is my tool of choice for its seamless interface and the collaborative freedom it offers. It’s not just about creating visually appealing designs but also about ensuring they resonate on a functional level. Whether it’s through UI/UX design, animation, or coding, the journey from concept to execution is what I find most rewarding. It’s about crafting experiences that are not only innovative but also intuitive.</p>
              <p>Ultimately, what I enjoy most is the synergy between these diverse skills. It’s a multidisciplinary approach that allows me to not only conceptualize but also bring these ideas to life in a way that is both technically sound and aesthetically compelling. From the intricacies of HTML/CSS/JavaScript to the creative prowess needed for effective design and animation, it’s this fusion of technology and art that defines my work.</p>
              <p>
                <a href="./banners/" style={{ textDecoration: "underline" }}>
                  HTML5 Banner Portfolio
                </a>
              </p>
            </div>
            <img src={me} className="geometric-me" alt="Geometric Aaron" />
          </article>
        </div>
      </section>
    );
  }
}

export default About;
