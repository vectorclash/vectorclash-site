import CanvasRadialGradient from "./CanvasRadialGradient";

export default class LargeRadialField {
  constructor(width, height, amount) {
    let canvas = document.createElement("canvas");
    let context = canvas.getContext("2d");

    canvas.width = width;
    canvas.height = height;

    let size = width / 4;

    for (var i = 0; i < amount; i++) {
      canvas.globalCompositeOperation = "overlay";

      let radGrad = new CanvasRadialGradient(
        size,
        size,
        1 + Math.round(Math.random() * 4)
      );

      let ranSize = size / 2 + Math.random() * size * 4;
      let ranX = -ranSize + Math.random() * width + ranSize / 2;
      let ranY = -ranSize + Math.random() * height + ranSize / 2;

      context.drawImage(radGrad, ranX, ranY, ranSize, ranSize);
    }

    return canvas;
  }
}
