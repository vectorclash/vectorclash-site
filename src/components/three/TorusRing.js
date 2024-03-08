import * as THREE from "three";
import gsap from "gsap/all";

export default class TorusRing {
  constructor(radius, angle, color, guide = false, double = false) {
    let container = new THREE.Group();

    this.radius = radius;
    this.angleOne = angle;
    this.angleTwo = angle + 180;
    this.angleIncrease = 0.03;

    let material = new THREE.MeshLambertMaterial({
      color: color,
      flatShading: false,
    });

    let geometry = new THREE.TetrahedronGeometry(0.5);

    this.shapeOne = new THREE.Mesh(geometry, material);
    container.add(this.shapeOne);

    if (double) {
      this.shapeTwo = new THREE.Mesh(geometry, material);
      container.add(this.shapeTwo);
    }

    if (guide) {
      let guideGeometry = new THREE.TorusGeometry(radius, 0.05, 2, 100);
      let guideMaterial = new THREE.MeshStandardMaterial({
        color: color,
        flatShading: true,
        transparent: true,
        opacity: 0.2,
      });

      let torusGuide = new THREE.Mesh(guideGeometry, guideMaterial);
      container.add(torusGuide);
    }

    gsap.ticker.add(this.update.bind(this));

    return container;
  }

  update() {
    this.angleOne += this.angleIncrease;
    this.shapeOne.position.x = Math.cos(this.angleOne) * this.radius;
    this.shapeOne.position.y = Math.sin(this.angleOne) * this.radius;

    this.shapeOne.rotation.x = Math.cos(this.angleOne);
    this.shapeOne.rotation.y = Math.sin(this.angleOne);

    if (this.shapeTwo) {
      this.angleTwo += this.angleIncrease;
      this.shapeTwo.position.x = Math.cos(this.angleTwo) * this.radius;
      this.shapeTwo.position.y = Math.sin(this.angleTwo) * this.radius;
    }
  }
}
