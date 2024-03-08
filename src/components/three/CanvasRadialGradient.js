import tinycolor from "tinycolor2";

export default class CanvasRadialGradient {
  constructor(width, height) {
    let canvas = document.createElement("canvas");
    let context = canvas.getContext("2d");

    canvas.width = width;
    canvas.height = height;

    let colorAmount = 2 + Math.round(Math.random() * 1);
    let colors = [];

    for (let i = 0; i < colorAmount; i++) {
      colors.push(
        tinycolor("#CCFF00")
          .spin(Math.round(Math.random() * 360))
          .toHexString()
      );
    }

    let gradient = context.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      0,
      canvas.width / 2,
      canvas.height / 2,
      canvas.width / 2
    );

    for (let i = 0; i < colors.length; i++) {
      gradient.addColorStop(i / colors.length, colors[i]);
    }

    gradient.addColorStop(1, "transparent");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    return canvas;
  }
}
