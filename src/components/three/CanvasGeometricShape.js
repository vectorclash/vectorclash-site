import tinycolor from "tinycolor2";

export default class CanvasGeometricShape {
  constructor(width, height, shapeNum) {
    this.shapeVertices = 6;
    this.shapeDepth = 2;
    this.shapeAng = 360 / this.shapeVertices;
    this.shapeSize = (width * height) / (height * 3);

    this.points = this.pointsArray(this.shapeSize);

    let canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    this.container = new createjs.Stage(canvas);
    this.container.x = canvas.width / 2;
    this.container.y = canvas.height / 2;
    this.container.rotation = 90;

    for (let i = 0; i < shapeNum; i++) {
      this.buildShape();
    }

    this.container.update();

    return canvas;
  }

  pointsArray(r) {
    let radius = r;
    let points = new Array();

    points.push(new Array(0, 0));

    for (let h = 1; h <= this.shapeDepth; h++) {
      for (let ang = 0; ang < 360; ang += this.shapeAng) {
        let rad = (ang * Math.PI) / 180;
        let newX = 0 + radius * h * Math.cos(rad);
        let newY = 0 + radius * h * Math.sin(rad);

        points.push(new Array(newX, newY));
      }
    }

    return points;
  }

  buildShape() {
    let randomPoints = this.between(0, this.points.length - 1);
    let shapePoints = new Array(
      this.points[randomPoints[0]],
      this.points[randomPoints[1]],
      this.points[randomPoints[2]]
    );

    let fill = new createjs.Shape();

    fill.graphics.beginLinearGradientFill(
      [
        tinycolor.random().toHexString(),
        tinycolor.random().toHexString(),
        tinycolor.random().toHexString(),
      ],
      [0, 0.5, 1],
      shapePoints[0][0],
      shapePoints[0][1],
      shapePoints[2][0],
      shapePoints[2][1]
    );

    fill.graphics.moveTo(shapePoints[0][0], shapePoints[0][1]);
    fill.graphics.lineTo(shapePoints[1][0], shapePoints[1][1]);
    fill.graphics.lineTo(shapePoints[2][0], shapePoints[2][1]);
    fill.graphics.lineTo(shapePoints[0][0], shapePoints[0][1]);

    fill.graphics.endFill();

    fill.compositeOperation = "hard-light";
    this.container.addChild(fill);
  }

  getRandomNumber(min, max) {
    let ranNumber = Math.random() * (max - min) + min;
    return ranNumber;
  }

  between(startNumber, endNumber) {
    let baseNumber = new Array();
    let randNumber = new Array();
    for (let i = startNumber; i <= endNumber; i++) {
      baseNumber[i] = i;
    }

    for (let i = endNumber; i > startNumber; i--) {
      let tempRandom =
        startNumber + Math.floor(Math.random() * (i - startNumber));
      randNumber[i] = baseNumber[tempRandom];
      baseNumber[tempRandom] = baseNumber[i];
    }

    randNumber[startNumber] = baseNumber[startNumber];

    return randNumber;
  }
}
