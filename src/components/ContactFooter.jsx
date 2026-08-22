import React from "react";
import { gsap, ScrollTrigger } from "gsap/all";
import tinycolor from "tinycolor2";
import "./ContactFooter.scss";

import bsIcon from "../images/bs-icon.svg";
import liIcon from "../images/li-icon.svg";
import ghIcon from "../images/gh-icon.svg";
import AnimatedParticles from "./AnimatedParticles";
import HeaderIcon from "./HeaderIcon";
import profileData from "../data/profile.json";

const socialIcons = {
  bluesky: bsIcon,
  github: ghIcon,
  linkedin: liIcon,
};

// How much taller the viewport gets when the mobile address bar collapses: the
// gap between the large and small viewport units. Returns 0 on desktop, and on
// browsers without svh/lvh support (the declarations are simply dropped there).
function addressBarHeight() {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:absolute;top:0;left:0;visibility:hidden;pointer-events:none;width:0;height:100svh";
  document.body.appendChild(probe);
  const small = probe.getBoundingClientRect().height;
  probe.style.height = "100lvh";
  const large = probe.getBoundingClientRect().height;
  probe.remove();
  return Math.max(large - small, 0);
}

class ContactFooter extends React.Component {
  constructor(props) {
    super(props);
    this.mount = React.createRef();
  }

  componentDidMount() {
    this.contactTl = this.buildContactTimeline();

    // "bottom bottom" would put the end at the very bottom of the document, but
    // ScrollTrigger measures that against the viewport height at refresh time and
    // then ignores the address bar collapsing on touch devices. Once the bar goes
    // away the page can't scroll that far anymore, so the scrub stalls partway.
    // Ending the address bar's height early keeps the end reachable in either
    // state; on desktop the offset is 0, which is exactly "bottom bottom".
    this.contactSt = ScrollTrigger.create({
      trigger: this.mount.current,
      start: "top bottom",
      end: () =>
        "+=" + Math.max(this.mount.current.offsetHeight - addressBarHeight(), 1),
      scrub: 1,
      animation: this.contactTl,
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
    if (this.contactSt) this.contactSt.kill();
    if (this.contactTl) this.contactTl.kill();
  }

  buildContactTimeline() {
    const tl = gsap.timeline({ paused: true });

    tl.fromTo(this.mount.current, { alpha: 0 }, { duration: 1, alpha: 1, ease: "quad.inOut" });
    tl.fromTo(
      this.mount.current.querySelectorAll("p, li, .copyright"),
      { alpha: 0, y: 20 },
      { duration: 0.5, alpha: 1, y: 0, stagger: { amount: 0.5 }, ease: "quad.inOut" },
      1
    );

    return tl;
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
    const { phone, email, social } = profileData.contact;
    const copyright = `\u00A9 ${new Date().getFullYear()} ${profileData.name.full}`;

    return (
      <footer className="contact-footer container" ref={this.mount}>
        <article className="column">
          <div className="footer-left">
            <h3>Contact me <HeaderIcon /></h3>
            <p>
              <a className="phone-link" href={phone.href}>
                {phone.display}
              </a>
            </p>
            <p>
              <a
                className="email-link"
                href={`mailto:${email}`}
              >
                {email}
              </a>
            </p>
            <div className="copyright">{copyright}</div>
          </div>
          <div className="footer-right">
            <ul className="social-links">
              {social.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img src={socialIcons[link.id]} alt={link.label} />
                  </a>
                </li>
              ))}
            </ul>
            <div className="copyright">{copyright}</div>
          </div>
        </article>
        <AnimatedParticles particles="20" />
      </footer>
    );
  }
}

export default ContactFooter;