import * as THREE from "three";
import gsap from "gsap";
import tinycolor from "tinycolor2";
import DrawnLine from "./DrawnLine";

export default class DrawnShape {
  constructor(size, lineWidth) {
    this.container = new THREE.Group();

    this.colorStart = new tinycolor("#00CCFF");
    this.startVector = new THREE.Vector3(0, 0, 0);
    this.endVector = new THREE.Vector3(0, 0, 0);

    this.currentNum = 0;
    this.currentLine = 0;

    this.mg = new THREE.IcosahedronGeometry(size);

    this.lineOne = new DrawnLine(
      [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
      ],
      this.colorStart,
      lineWidth
    );
    this.container.add(this.lineOne.container);

    this.lineTwo = new DrawnLine(
      [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
      ],
      this.colorStart,
      lineWidth
    );
    this.container.add(this.lineTwo.container);

    this.drawLine();

    return this.container;
  }

  drawLine() {
    let rv = Math.floor(Math.random() * this.mg.vertices.length);
    this.endVector = new THREE.Vector3(
      this.mg.vertices[rv].x,
      this.mg.vertices[rv].y,
      this.mg.vertices[rv].z
    );

    let lineCoords = [this.startVector, this.endVector];

    this.startVector = new THREE.Vector3(
      this.endVector.x,
      this.endVector.y,
      this.endVector.z
    );

    let animationTime = 0.777;

    let color = this.colorStart.spin(5);

    if (this.currentLine === 0) {
      this.lineOne.changeLine(lineCoords, color, animationTime);
      this.currentLine = 1;
    } else {
      this.lineTwo.changeLine(lineCoords, color, animationTime);
      this.currentLine = 0;
    }

    this.colorStart = color;

    gsap.delayedCall(animationTime, this.drawLine.bind(this));
  }
}
