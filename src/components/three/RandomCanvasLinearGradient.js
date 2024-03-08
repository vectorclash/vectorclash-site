import tinycolor from "tinycolor2";

export default class RandomCanvasLinearGradient {
  constructor(width, height) {
    let canvas = document.createElement("canvas");
    let context = canvas.getContext("2d");

    canvas.width = width;
    canvas.height = height;

    // let colors = tinycolor('#CCFF00').spin(Math.round(Math.random() * 360)).triad()

    let colorAmount = 2 + Math.round(Math.random() * 1);
    let colors = [];

    for (let i = 0; i < colorAmount; i++) {
      colors.push(
        tinycolor("#CCFF00")
          .spin(Math.round(Math.random() * 360))
          .toHexString()
      );
    }

    colors.push(tinycolor(colors[0]).toHexString());

    let gradient;
    gradient = context.createLinearGradient(0, height / 2, width, height / 2);

    // let ranDirection = Math.random()
    // if(ranDirection > 0.5) {
    //   gradient = context.createLinearGradient(0, Math.random() * height, width, Math.random() * height)
    // } else {
    //   gradient = context.createLinearGradient(Math.random() * width, 0, Math.random() * width, height)
    // }

    for (let i = 0; i < colors.length; i++) {
      gradient.addColorStop(i / colorAmount, colors[i]);
    }

    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    return canvas;
  }
}
