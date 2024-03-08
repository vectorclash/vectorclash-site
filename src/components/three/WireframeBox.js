import * as THREE from "three";
import gsap from "gsap/all";

export default class WireframeBox {
  constructor(size, depth, color) {
    this.hue = 0;
    let geometry = new THREE.BoxGeometry(size, size, size, depth, depth, depth);

    this.material = new THREE.MeshBasicMaterial({
      color: color,
      side: THREE.DoubleSide,
      wireframe: true,
      transparent: true,
      opacity: 0.1,
      fog: false,
    });

    let shape = new THREE.Mesh(geometry, this.material);
    shape.rotation.x = Math.random() * Math.PI;
    shape.rotation.y = Math.random() * Math.PI;
    shape.rotation.z = Math.random() * Math.PI;

    gsap.from(this.material, {
      duration: 2,
      opacity: 0,
      ease: "quad.inOut",
      delay: 0.5,
    });

    gsap.to(shape.rotation, {
      duration: 150,
      z: -shape.rotation.z + Math.PI * 2,
      repeat: -1,
      ease: "none",
    });

    this.changeColor();

    return shape;
  }

  changeColor() {
    gsap.to(this, {
      hue: Math.random(),
      duration: 5 + Math.random() * 20,
      ease: "quad.inOut",
      onUpdate: () => {
        this.material.color.setHSL(this.hue, 1.0, 0.5);
      },
      onComplete: this.changeColor.bind(this)
    });
  }
}
