import tinycolor from "tinycolor2";

export default class GradientGenerator {
  constructor(colorNum, random = false) {
    let colorRotation = this.randomColorRotation();
    let colorSize = 30 + Math.random() * 80;

    let baseColor = tinycolor("#CCFF00").spin(this.randomColorRotation());

    this.colors = [];
    if (random) {
      for (let i = 0; i < colorNum; i++) {
        this.colors.push(
          new tinycolor(baseColor.toHexString()).spin(
            this.randomColorRotation()
          )
        );
      }
    } else {
      for (let i = 0; i < colorNum; i++) {
        this.colors.push(
          new tinycolor(baseColor.toHexString()).spin(
            colorRotation + colorSize * i
          )
        );
      }
    }

    return this;
  }

  randomColorRotation() {
    return Math.round(Math.random() * 360);
  }
}
