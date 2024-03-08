import * as THREE from "three";
import tinycolor from "tinycolor2";
import TorusRing from "./TorusRing";

export default class Toroid {
  constructor(radius, amount) {
    let container = new THREE.Group();
    for (let i = 0; i < amount; i++) {
      let color = tinycolor("#CCFF00")
        .spin((i / amount) * 360)
        .toHexString();
      let ring = new TorusRing(radius, (i / amount) * 360, color, false);
      ring.rotation.y = -this.degreesToRadians((i / amount) * 360);

      ring.position.x =
        Math.cos(this.degreesToRadians((i / amount) * 360)) * radius;
      ring.position.z =
        Math.sin(this.degreesToRadians((i / amount) * 360)) * radius;

      container.add(ring);
    }
    return container;
  }

  degreesToRadians(degrees) {
    let pi = Math.PI;
    return degrees * (pi / 180);
  }
}
