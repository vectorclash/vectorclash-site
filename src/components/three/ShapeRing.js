import * as THREE from "three";
import tinycolor from "tinycolor2";
import gsap from "gsap/all";

export default class ShapeRing {
  constructor(shapeSize, shapeNum, layers, color, radiusModifier = 1) {
    this.container = new THREE.Object3D();

    let geometry = new THREE.IcosahedronGeometry(shapeSize);

    this.color = color;

    let shapeAng = 360 / shapeNum;
    let radius = shapeSize * radiusModifier;

    this.points = new Array();

    for (let h = 1; h <= layers; h++) {
      for (let ang = 0; ang < 360; ang += shapeAng) {
        let rad = this.radians(ang);
        let newX = 0 + radius * h * Math.cos(rad);
        let newY = 0 + radius * h * Math.sin(rad);

        this.points.push(new Array(newX, newY));
      }
    }

    for (var i = 0; i < this.points.length; i++) {
      let material = new THREE.MeshBasicMaterial({
        color: this.color.spin(Math.random() * 5).toHexString(),
        side: THREE.DoubleSide,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
        fog: false,
      });

      let newShape = new THREE.Mesh(geometry, material);
      newShape.position.x = this.points[i][0];
      newShape.position.y = this.points[i][1];

      this.container.add(newShape);
    }

    gsap.ticker.add(this.update.bind(this));

    return this.container;
  }

  radians(degrees) {
    return (degrees * Math.PI) / 180;
  }

  update() {
    for (var i = 0; i < this.container.children.length; i++) {
      this.container.children[i].rotation.x += 0.003;
      this.container.children[i].rotation.y += 0.002;
      this.container.children[i].rotation.z += 0.004;
    }
  }
}
