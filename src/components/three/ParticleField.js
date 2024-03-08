import * as THREE from "three";
import CanvasRadialGradient from "./CanvasRadialGradient";

export default class ParticleField {
  constructor(particleNum, image, size, opacity, containerSize) {
    this.particleCount = particleNum;
    this.particles = new THREE.BufferGeometry();

    let canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    let context = canvas.getContext("2d");

    context.globalCompositeOperation = "destination-atop";
    let gradient = new CanvasRadialGradient(image.width, image.height);
    context.drawImage(gradient, 0, 0);

    context.drawImage(image, 0, 0);

    let texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;

    this.particleMaterial = new THREE.PointsMaterial({
      size: size,
      map: texture,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: opacity,
      depthWrite: false,
      fog: false,
    });

    let vertices = [];

    for (let p = 0; p < this.particleCount; p++) {
      let pX = -containerSize.x + Math.random() * (containerSize.x * 2),
        pY = -containerSize.y + Math.random() * (containerSize.y * 2),
        pZ = -containerSize.z + Math.random() * (containerSize.z * 2);

      vertices.push(pX, pY, pZ);
    }

    const vertices32 = new Float32Array(vertices);

    this.particles.setAttribute(
      "position",
      new THREE.BufferAttribute(vertices32, 3)
    );

    this.particleSystem = new THREE.Points(
      this.particles,
      this.particleMaterial
    );
  }
}
