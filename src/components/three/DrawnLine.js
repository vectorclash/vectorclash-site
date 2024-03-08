import * as THREE from "three";
import { gsap, Quad } from "gsap";
import { MeshLine, MeshLineMaterial } from "three.meshline";

export default class DrawnLine {
  constructor(coords, color, width) {
    this.coords = coords;

    this.container = new THREE.Object3D();

    this.geometry = new THREE.BufferGeometry().setFromPoints(coords);

    this.material = new MeshLineMaterial({
      color: new THREE.Color(color.toHexString()),
      lineWidth: width,
      transparent: true,
      opacity: 0.5,
      fog: false,
    });

    this.line = new MeshLine();
    this.line.setGeometry(this.geometry);

    this.mesh = new THREE.Mesh(this.line.geometry, this.material);
    this.container.add(this.mesh);

    return this;
  }

  update() {
    this.geometry.vertices = [];
    for (let i = 0; i < this.coords.length; i++) {
      this.geometry.vertices.push(this.coords[i]);
    }

    this.line.setGeometry(this.geometry);
  }

  changeLine(coords, color, time) {
    this.coords = coords;

    let tl = new gsap.timeline();

    tl.from(this.coords[1], {
      duration: time,
      x: this.coords[0].x,
      y: this.coords[0].y,
      z: this.coords[0].z,
      ease: Quad.easeInOut,
      onUpdate: this.update.bind(this),
    });

    tl.to(this.coords[0], {
      duration: time,
      x: this.coords[1].x,
      y: this.coords[1].y,
      z: this.coords[1].z,
      ease: Quad.easeInOut,
      onUpdate: this.update.bind(this),
    });

    this.material.color = new THREE.Color(color.toHexString());
  }
}