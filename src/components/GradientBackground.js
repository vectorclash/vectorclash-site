import React from "react";
import gsap from "gsap/all";
import GradientGenerator from "./utils/GradientGenerator";
import "./GradientBackground.scss";

class GradientBackground extends React.Component {
  constructor(props) {
    super(props);
    this.mount = React.createRef();
  }

  componentDidMount() {
    this.chooseColors();
  }

  chooseColors() {
    let colorAmount = 3;
    let randomChance = Math.random();
    let colorRandom = false;
    if (randomChance > 0.5) {
      colorRandom = false;
      colorAmount += Math.round(Math.random() * 3);
    }

    this.colors = new GradientGenerator(colorAmount, colorRandom).colors;
    this.updateColors();
  }

  updateColors() {
    let gradientString = "linear-gradient(42deg, ";

    for (var i = 0; i < this.colors.length; i++) {
      gradientString += this.colors[i].toHexString();
      if (i < this.colors.length - 1) {
        gradientString += ", ";
      } else {
        gradientString += ")";
      }
    }

    let gradient = document.createElement('div');
    gradient.classList.add('gradient');
    gradient.style.backgroundImage = gradientString;

    for (let i = 0; i < this.mount.current.children.length; i++) {
      const element = this.mount.current.children[i];
      gsap.fromTo(
        element,
        {
          alpha: 1,
        },
        {
          alpha: 0,
          duration: 5,
          ease: "quad.inOut",
          onComplete: this.removeChildElement.bind(this),
          onCompleteParams: [element]
        }
      );
    }

    this.mount.current.prepend(gradient);
    gsap.delayedCall(5 + Math.random() * 10, this.chooseColors.bind(this));
  }

  removeChildElement(element) {
    this.mount.current.removeChild(element);
  }

  render() {
    return <div className="gradient-background" ref={this.mount}></div>;
  }
}

export default GradientBackground;