import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/all";
import tinycolor from "tinycolor2";

import merkaba from "../../assets/models/basic-merkaba.glb";

export default class BrightCluster {
  constructor() {
    this.container = new THREE.Object3D();

    gsap.registerPlugin(MotionPathPlugin);
    gsap.ticker.add(this.update.bind(this));

    gsap.to(this.container.rotation, {
      duration: 20,
      y: Math.PI * 2,
      ease: "none",
      repeat: -1,
    });

    this.buildShapes(10);
    this.buildBrightShapes();

    return this.container;
  }

  buildShapes(amount) {
    const loader = new GLTFLoader();

    loader.load(merkaba, (gltf) => {
      for (let i = 0; i < amount; i++) {
        // let shapeSize = 3 + Math.round(Math.random() * 5);
        let geometry = gltf.scene.children[0].geometry;
        let ranColor = 0xCCCCCC;
        let material = new THREE.MeshStandardMaterial({
          color: ranColor,
          metalness: 1,
          roughness: 1
        })
        let mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        this.moveShape(mesh, 2, 100);
        this.scaleShape(mesh);
        this.container.add(mesh);
      }
    }, undefined, (error) => {
      console.error(error);
    });

    
  }

  buildBrightShapes() {
    let colors = tinycolor('#CCFF00').spin(Math.random() * 360).tetrad();

    for (let i = 0; i < colors.length; i++) {
      let shapeContainer = new THREE.Object3D();
      shapeContainer.position.set(
        -50 + Math.random() * 100,
        -50 + Math.random() * 100,
        -50 + Math.random() * 100
      );

      let shapeSize = 0.5 + Math.round(Math.random() * 2);
      let geometry = new THREE.IcosahedronGeometry(shapeSize, 2);
      let material = new THREE.MeshStandardMaterial({
        color: colors[i].toHexString(),
        emissive: colors[i].toHexString(),
        emissiveIntensity: 1,
        fog: false
      });
      let mesh = new THREE.Mesh(geometry, material);
      shapeContainer.add(mesh);

      let pointLight = new THREE.PointLight(colors[i].toHexString(), 10, 100, 0);
      pointLight.castShadow = true;
      pointLight.shadow.mapSize.width = 512;
      pointLight.shadow.mapSize.height = 512;
      shapeContainer.add(pointLight);

      this.moveShape(shapeContainer, 150, 2);
      this.container.add(shapeContainer);
    }
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
        z: newZ
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
      onCompleteParams: [shape, positionRange, speed]
    });
  }

  scaleShape(shape) {
    let scaleMin = 2;
    let scaleMax = 3;
    if(window.innerWidth < 400) {
      scaleMin = 1;
      scaleMax = 2.5;
    }
    let ranScale = scaleMin + Math.random() * scaleMax;
    let ranTime = 1 + Math.random() * 10;

    gsap.to(shape.scale, {
      duration: ranTime,
      x: ranScale,
      y: ranScale,
      z: ranScale,
      ease: "bounce.inOut",
      onComplete: this.scaleShape.bind(this),
      onCompleteParams: [shape]
    });
  }

  update() {
    for (let i = 0; i < this.container.children.length; i++) {
      const element = this.container.children[i];
      element.lookAt(this.container.position.x, this.container.position.y, this.container.position.z);
    }
  }
}