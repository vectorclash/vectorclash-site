import React from "react";
import { gsap, SplitText, ScrollTrigger } from "gsap/all";
import "./Header.scss";
import PDFIcon from "./PDFIcon";
import ThreeHeaderBackground from "./ThreeHeaderBackground";
import Logo from "./Logo";
import profileData from "../data/profile.json";

class Header extends React.Component {
  constructor(props) {
    super(props);
    this.myRef = React.createRef();
    gsap.registerPlugin(SplitText, ScrollTrigger);
  }

  componentDidMount() {
    // window.addEventListener('beforeunload', this.resetWindow)
    // Wait for fonts to load before animating to prevent SplitText errors
    document.fonts.ready.then(() => {
      this.animateElements();
    });
  }

  resetWindow(e) {
    window.scrollTo(0, 0);
  }

  animateElements() {
    let tl = gsap.timeline({ delay: 1 });

    tl.to(this.myRef.current.querySelector("article").children[0], {
      duration: 1,
      alpha: 1,
      ease: "quad.out",
    });

    // Make h2 visible so SplitText words can be seen
    const h2Element = this.myRef.current.querySelector("article").children[1];
    gsap.set(h2Element, { autoAlpha: 1 });

    let headlineSplit1 = new SplitText(h2Element, { type: "words" });

    tl.fromTo(headlineSplit1.words, {
      x: 30,
      alpha: 0,
    }, {
      duration: 0.5,
      x: 0,
      alpha: 1,
      ease: "elastic.out",
      stagger: {
        amount: 0.5,
      },
    });

    // Make h1 visible so SplitText words can be seen
    const h1Element = this.myRef.current.querySelector("article").children[2];
    gsap.set(h1Element, { autoAlpha: 1 });

    let headlineSplit2 = new SplitText(h1Element, { type: "words" });

    tl.fromTo(headlineSplit2.words, {
      y: -30,
      scaleY: 0.5,
      rotation: -20,
      skewY: 20,
      alpha: 0,
    }, {
      duration: 0.5,
      y: 0,
      scaleY: 1,
      rotation: 0,
      skewY: 0,
      alpha: 1,
      ease: "bounce.out",
      stagger: {
        amount: 0.5,
      },
    });

    // Make p visible so SplitText words can be seen
    const pElement = this.myRef.current.querySelector("p");
    gsap.set(pElement, { autoAlpha: 1 });

    let subHeadlineSplit = new SplitText(pElement, { type: "words" });

    tl.fromTo(subHeadlineSplit.words, {
      x: 30,
      alpha: 0,
    }, {
      duration: 0.5,
      x: 0,
      alpha: 1,
      ease: "back.out",
      stagger: {
        amount: 0.5,
      },
    });

    tl.fromTo(this.myRef.current.querySelector(".header-buttons"), {
      alpha: 0,
      y: 30,
    }, {
      duration: 0.5,
      y: 0,
      alpha: 1,
      ease: "quad.out",
    });
  }

  render() {
    return (
      <header className="header container" ref={this.myRef}>
        <article className="column">
          <Logo />
          <h2>{profileData.greeting}</h2>
          <h1>
            <b>{profileData.name.full}.</b>
          </h1>
          <p dangerouslySetInnerHTML={{ __html: profileData.intro }} />
          <div className="header-buttons">
            <a href={profileData.resume.url} target="_blank">
              {profileData.resume.text} {<PDFIcon />}
            </a>
          </div>
        </article>
        <ThreeHeaderBackground />
      </header>
    );
  }
}

export default Header;
