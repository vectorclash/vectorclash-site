import CanvasLinearGradient from "./CanvasLinearGradient";

export default class StarField {
  constructor(width, height, images) {
    let canvas = document.createElement("canvas");
    let context = canvas.getContext("2d");

    canvas.width = width;
    canvas.height = height;

    context.globalCompositeOperation = "destination-atop";

    let gradient = new CanvasLinearGradient(width, height);
    context.drawImage(gradient, 0, 0);

    let starCanvas = document.createElement("canvas");
    let starContext = starCanvas.getContext("2d");

    starCanvas.width = width;
    starCanvas.height = height;

    let xlStarSizeMax = width / 2;
    let xlStarSizeMin = width / 20;

    for (var i = 0; i < 5; i++) {
      let ranSize = xlStarSizeMin + Math.random() * xlStarSizeMax;
      let ranX = -100 + Math.random() * width + 100;
      let ranY = -100 + Math.random() * height + 100;

      starContext.drawImage(images[0], ranX, ranY, ranSize, ranSize);
    }

    let largeStarSizeMax = width / 7;
    let largeStarSizeMin = width / 150;

    for (var i = 0; i < 50; i++) {
      let ranSize = largeStarSizeMin + Math.random() * largeStarSizeMax;
      let ranX = -100 + Math.random() * width + 100;
      let ranY = -100 + Math.random() * height + 100;

      starContext.drawImage(images[0], ranX, ranY, ranSize, ranSize);
    }

    let mediumStarSizeMax = width / 100;
    let mediumStarSizeMin = width / 5000;

    for (var i = 0; i < 200; i++) {
      let ranSize = mediumStarSizeMin + Math.random() * mediumStarSizeMax;
      let ranX = -100 + Math.random() * width + 100;
      let ranY = -100 + Math.random() * height + 100;

      starContext.drawImage(images[1], ranX, ranY, ranSize, ranSize);
    }

    let smallStarSizeMax = width / 350;
    let smallStarSizeMin = width / 10000;

    let smallStarAmount = 5000 + Math.round(Math.random() * 5000);

    for (var i = 0; i < smallStarAmount; i++) {
      let ranSize = smallStarSizeMin + Math.random() * smallStarSizeMax;
      let ranX = -100 + Math.random() * width + 100;
      let ranY = -100 + Math.random() * height + 100;

      starContext.drawImage(images[1], ranX, ranY, ranSize, ranSize);
    }

    context.drawImage(starCanvas, 0, 0);

    return canvas;
  }
}
