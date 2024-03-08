import * as THREE from "three";
import tinycolor from "tinycolor2";
import gsap from "gsap/all";
import ShapeRing from "./ShapeRing";

export default class ShapeRingSphere {
  constructor(shapeSize, ringNum, ringSize, layers, padding) {
    this.container = new THREE.Object3D();

    let color = tinycolor("#CCFF00");

    for (var i = 0; i < ringNum; i++) {
      let ring = new ShapeRing(
        shapeSize,
        ringSize,
        layers,
        color.spin(5),
        padding
      );
      ring.rotation.y = (i / ringNum) * Math.PI;
      this.container.add(ring);
    }

    let geometry = new THREE.IcosahedronGeometry(shapeSize);
    let material = new THREE.MeshBasicMaterial({
      color: color.toHexString(),
      wireframe: true,
    });

    let centerShape = new THREE.Mesh(geometry, material);
    this.container.add(centerShape);

    this.moveRings();

    return this.container;
  }

  moveRings() {
    const ranTime = 10 + Math.random() * 20;
    const ranRotation = -(Math.PI * 10) + Math.random() * (Math.PI * 20);

    for (var i = 0; i < this.container.children.length; i++) {
      let ring = this.container.children[i];
      gsap.to(ring.rotation, ranTime, {
        x: ranRotation * (i * 0.05),
        y: ranRotation * (i * 0.05),
        ease: "none",
        delay: i * 0.009,
      });
    }

    gsap.delayedCall(ranTime, this.moveRings.bind(this));
  }
}
