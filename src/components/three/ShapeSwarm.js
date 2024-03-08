import * as THREE from "three";
import gsap from "gsap/all";
import { MotionPathPlugin } from "gsap/all";
import RandomCanvasLinearGradient from "./RandomCanvasLinearGradient";

export default class ShapeSwarm {
  constructor(amount, containerSize) {
    this.container = new THREE.Group();
    let geometryType = Math.floor(Math.random() * 3);
    let ranSize = 10 + Math.random() * 60;
    let geometry = this.randomGeometry(ranSize, geometryType);

    gsap.registerPlugin(MotionPathPlugin);
    gsap.ticker.add(this.update.bind(this));

    for (let i = 0; i < amount; i++) {
      let gradient = new RandomCanvasLinearGradient(256, 256);
      let texture = new THREE.Texture(gradient);
      texture.needsUpdate = true;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;

      let material = new THREE.MeshStandardMaterial({
        map: texture,
        flatShading: false,
        transparent: true,
        opacity: 0.9,
      });

      let shape = new THREE.Mesh(geometry, material);
      shape.rotation.x = Math.random() * Math.PI;
      shape.rotation.y = Math.random() * Math.PI;
      shape.rotation.z = Math.random() * Math.PI;
      shape.castShadow = true;
      shape.receiveShadow = true;

      let ranScale = 0.1 + Math.random() * 0.2;
      shape.scale.set(ranScale, ranScale, ranScale);

      let ranX = -containerSize.x + Math.random() * (containerSize.x * 2);
      let ranY = -containerSize.y + Math.random() * (containerSize.y * 2);
      let ranZ = -containerSize.z + Math.random() * (containerSize.z * 2);
      shape.position.set(ranX, ranY, ranZ);

      this.moveShape(shape, 250, 10);

      this.container.add(shape);
    }

    gsap.to(this.container.rotation, {
      duration: 50,
      y: Math.PI * 2,
      repeat: -1,
      ease: "none",
    });

    let ranScale = 1 + Math.random() * 2;

    gsap.to(this.container.scale, {
      duration: 30 + Math.random() * 20,
      x: ranScale,
      y: ranScale,
      z: ranScale,
      yoyo: true,
      repeat: -1,
      ease: "back.inOut",
    });

    return this.container;
  }

  moveShape(shape, positionRange, speed) {
    let path = [];
    for (let i = 0; i < 3; i++) {
      let newX = -(positionRange / 2) + Math.random() * positionRange;
      let newY = -(positionRange / 2) + Math.random() * positionRange;
      let newZ = -(positionRange / 2) + Math.random() * positionRange;
      const coords = {
        x: newX,
        y: newY,
        z: newZ,
      };
      path.push(coords);
    }

    gsap.to(shape.position, {
      duration: speed + Math.random() * (speed * 5),
      motionPath: {
        path: path,
      },
      ease: "quad.inOut",
      onComplete: this.moveShape.bind(this),
      onCompleteParams: [shape, positionRange, speed],
    });
  }

  randomGeometry(size, type) {
    let geometry;

    switch (type) {
      case 0:
        geometry = new THREE.TetrahedronGeometry(size);
        break;

      case 1:
        geometry = new THREE.IcosahedronGeometry(size);
        break;

      case 2:
        geometry = new THREE.OctahedronGeometry(size);
        break;

      default:
        geometry = new THREE.TetrahedronGeometry(size);
    }

    return geometry;
  }

  update() {
    for (let i = 0; i < this.container.children.length; i++) {
      const element = this.container.children[i];
      element.lookAt(
        this.container.position.x,
        this.container.position.y,
        this.container.position.z
      );
    }
  }
}
