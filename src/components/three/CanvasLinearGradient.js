import tinycolor from "tinycolor2";

export default class CanvasLinearGradient {
  constructor(width, height, colors) {
    let canvas = document.createElement("canvas");
    let context = canvas.getContext("2d");

    canvas.width = width;
    canvas.height = height;

    let gradient;
    gradient = context.createLinearGradient(0, height / 2, width, height / 2);

    // let ranDirection = Math.random()
    // if(ranDirection > 0.5) {
    //   gradient = context.createLinearGradient(0, Math.random() * height, width, Math.random() * height)
    // } else {
    //   gradient = context.createLinearGradient(Math.random() * width, 0, Math.random() * width, height)
    // }

    gradient.addColorStop(
      0,
      tinycolor("#CCFF00").spin(colors.color1).toHexString()
    );
    gradient.addColorStop(
      0.35,
      tinycolor("#CCFF00").spin(colors.color2).toHexString()
    );
    gradient.addColorStop(
      0.72,
      tinycolor("#CCFF00").spin(colors.color3).toHexString()
    );
    gradient.addColorStop(
      1,
      tinycolor("#CCFF00").spin(colors.color1).toHexString()
    );

    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    return canvas;
  }
}
