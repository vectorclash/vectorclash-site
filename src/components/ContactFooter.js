import React from "react";
import { gsap, ScrollTrigger } from "gsap/all";
import tinycolor from "tinycolor2";
import "./ContactFooter.scss";

import igIcon from "../images/ig-icon.svg";
import liIcon from "../images/li-icon.svg";
import AnimatedParticles from "./AnimatedParticles";

class ContactFooter extends React.Component {
  constructor(props) {
    super(props);
    this.mount = React.createRef();
  }

  componentDidMount() {
    ScrollTrigger.create({
      trigger: this.mount.current,
      once: true,
      onEnter: () => {
        this.animateContact();
      },
    });

    this.colors = {
      color1: this.randomColorRotation(),
      color2: this.randomColorRotation(),
    };

    this.updateColors();
    gsap.delayedCall(1, this.animateColors.bind(this));
  }

  componentWillUnmount() {
    gsap.killTweensOf(this.colors);
  }

  animateContact() {
    gsap.fromTo(
      this.mount.current,
      {
        alpha: 0,
      },
      {
        duration: 1,
        alpha: 1,
        ease: "quad.inOut",
      }
    );

    gsap.fromTo(
      this.mount.current.querySelectorAll("p, li, .copyright"),
      {
        alpha: 0,
        y: 20,
      },
      {
        duration: 0.5,
        alpha: 1,
        y: 0,
        stagger: {
          amount: 0.5,
        },
        delay: 1,
        ease: "quad.inOut",
      }
    );
  }

  animateColors() {
    let animTime = 10 + Math.random() * 40;
    gsap.to(this.colors, {
      duration: animTime,
      color1: this.randomColorRotation(),
      color2: this.randomColorRotation(),
      ease: "quad.inOut",
      onUpdate: this.updateColors.bind(this),
      onComplete: this.animateColors.bind(this),
    });
  }

  updateColors() {
    let color1 = tinycolor("#CCFF00").spin(this.colors.color1);
    let color2 = tinycolor("#CCFF00").spin(this.colors.color2);

    this.mount.current.style.backgroundImage =
      "linear-gradient(42deg, " +
      color1.toHexString() +
      ", " +
      color2.toHexString() +
      ")";
  }

  randomColorRotation() {
    return Math.round(Math.random() * 360);
  }

  render() {
    return (
      <footer className="contact-footer container" ref={this.mount}>
        <article className="column">
          <div className="footer-left">
            <h3>Contact me /</h3>
            <p>
              <a className="phone-link" href="tel:720-519-8217">
                +1 720 519 8217
              </a>
            </p>
            <p>
              <a
                className="email-link"
                href="mailto:aaron.sterczewski@gmail.com"
              >
                aaron.sterczewski@gmail.com
              </a>
            </p>
            <div className="copyright">
              &copy; {new Date().getFullYear()} Aaron Ezra Sterczewski
            </div>
          </div>
          <div className="footer-right">
            <ul className="social-links">
              <li>
                <a
                  href="https://www.instagram.com/vectorclash/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src={igIcon} alt="Instagram" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/in/aaronezra/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src={liIcon} alt="Linkedin" />
                </a>
              </li>
            </ul>
            <div className="copyright">
              &copy; {new Date().getFullYear()} Aaron Ezra Sterczewski
            </div>
          </div>
        </article>
        <AnimatedParticles particles="20" />
      </footer>
    );
  }
}

export default ContactFooter;
