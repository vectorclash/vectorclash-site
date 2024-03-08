import React from "react";
import { gsap, SplitText, ScrollTrigger } from "gsap/all";
import "./Header.scss";
import PDFIcon from "./PDFIcon";
import ThreeHeaderBackground from "./ThreeHeaderBackground";
import Logo from "./Logo";

class Header extends React.Component {
  constructor(props) {
    super(props);
    this.myRef = React.createRef();
    gsap.registerPlugin(SplitText, ScrollTrigger);
  }

  componentDidMount() {
    // window.addEventListener('beforeunload', this.resetWindow)
    this.animateElements();
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

    let headlineSplit1 = new SplitText(
      this.myRef.current.querySelector("article").children[1],
      { type: "words" }
    );

    tl.from(headlineSplit1.words, {
      duration: 0.5,
      x: 30,
      alpha: 0,
      ease: "elastic.out",
      stagger: {
        amount: 0.5,
      },
    });

    let headlineSplit2 = new SplitText(
      this.myRef.current.querySelector("article").children[2],
      { type: "words" }
    );

    tl.from(headlineSplit2.words, {
      duration: 0.5,
      y: -30,
      scaleY: 0.5,
      rotation: -20,
      skewY: 20,
      alpha: 0,
      ease: "bounce.out",
      stagger: {
        amount: 0.5,
      },
    });

    let subHeadlineSplit = new SplitText(
      this.myRef.current.querySelector("p"),
      { type: "words" }
    );
    tl.from(subHeadlineSplit.words, {
      duration: 0.5,
      x: 30,
      alpha: 0,
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
          <h2>Hello! My name is</h2>
          <h1>
            <b>Aaron Ezra Sterczewski.</b>
          </h1>
          <p>
            I'm a <b>creative developer / motion engineer</b> and I love color.
          </p>
          <div className="header-buttons">
            <a href="./documents/resume.pdf" target="_blank">
              Résumé {<PDFIcon />}
            </a>
          </div>
        </article>
        <ThreeHeaderBackground />
      </header>
    );
  }
}

export default Header;
