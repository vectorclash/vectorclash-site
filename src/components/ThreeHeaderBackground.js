import React from "react";
import GradientBackground from "./GradientBackground";
import ThreeHeaderCanvas from "./three/ThreeHeaderCanvas";
import "./ThreeHeaderBackground.scss";
import GradientGenerator from "./utils/GradientGenerator";

class ThreeHeaderBackground extends React.Component {
  constructor(props) {
    super(props);
    this.mount = React.createRef();
  }

  componentDidMount() {
    let colorAmount = 3;
    let randomChance = Math.random();
    let colorRandom = false;
    if (randomChance > 0.5) {
      colorRandom = false;
      colorAmount += Math.round(Math.random() * 3);
    }

    this.colors = new GradientGenerator(colorAmount, colorRandom).colors;

    let canvas = new ThreeHeaderCanvas(
      this.mount.current.offsetWidth,
      this.mount.current.offsetHeight,
      this.colors
    );
    this.mount.current.appendChild(canvas);
  }

  render() {
    return (
      <div className="three-background" ref={this.mount}>
        <GradientBackground />
      </div>
    )
  }
}

export default ThreeHeaderBackground;
