import * as THREE from "three";
import gsap from "gsap/all";
// import tinycolor from 'tinycolor2'
import RandomCanvasLinearGradient from "./RandomCanvasLinearGradient";

export default class TexturedShape {
  constructor(size, opacity) {
    let geometry = new THREE.IcosahedronGeometry(size);

    for (var i = 0; i < geometry.vertices.length; i++) {
      geometry.vertices[i].x += -10 + Math.random() * 20;
      geometry.vertices[i].y += -10 + Math.random() * 20;
      geometry.vertices[i].z += -10 + Math.random() * 20;
    }

    let gradient = new RandomCanvasLinearGradient(256, 256);
    let texture = new THREE.Texture(gradient);
    texture.needsUpdate = true;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    let textureEnv = new THREE.Texture(gradient);

    let material = new THREE.MeshStandardMaterial({
      map: texture,
      envMap: textureEnv,
      color: 0xcccccc,
      roughness: 0,
      fog: false,
      transparent: true,
      opacity: opacity,
      side: THREE.BackSide,
    });

    let shape = new THREE.Mesh(geometry, material);
    shape.rotation.x = Math.random() * Math.PI;
    shape.rotation.y = Math.random() * Math.PI;
    shape.rotation.z = Math.random() * Math.PI;

    gsap.from(shape.material, {
      duration: 3,
      opacity: 0,
      ease: "quad.inOut",
    });

    gsap.to(shape.rotation, {
      duration: 150,
      z: shape.rotation.z + Math.PI * 2,
      repeat: -1,
      ease: "none",
    });

    gsap.to(shape.scale, {
      duration: 30 + Math.random() * 20,
      x: 1 + Math.random() * 2,
      yoyo: true,
      repeat: -1,
      ease: "back.inOut",
    });

    gsap.to(shape.scale, {
      duration: 30 + Math.random() * 20,
      y: 1 + Math.random() * 2,
      yoyo: true,
      repeat: -1,
      ease: "back.inOut",
    });

    gsap.to(shape.scale, {
      duration: 30 + Math.random() * 20,
      z: 1 + Math.random() * 2,
      yoyo: true,
      repeat: -1,
      ease: "back.inOut",
    });

    return shape;
  }
}
