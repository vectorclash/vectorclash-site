import * as THREE from "three";
import tinycolor from "tinycolor2";

export default class ProjectShape {
  constructor(size, textureURL) {
    let container = new THREE.Group();
    let geometry = new THREE.BoxGeometry(size, size, size, 6, 6, 6);

    let texture = new THREE.TextureLoader().load(textureURL);
    texture.wrapS = THREE.RepeatWrapping;
    texture.repeat.x = -1;
    let material = new THREE.MeshStandardMaterial({
      map: texture,
      color: 0x777777,
      roughness: 0.5,
      side: THREE.BackSide,
      transparent: true,
      opacity: 1,
    });

    let mesh = new THREE.Mesh(geometry, material);
    container.add(mesh);

    let wireframeMaterial = new THREE.MeshBasicMaterial({
      color: tinycolor("#CCFF00")
        .spin(Math.random() * 360)
        .toHexString(),
      wireframe: true,
      transparent: true,
      opacity: 0.1,
    });
    let wireframeMesh = new THREE.Mesh(geometry, wireframeMaterial);
    wireframeMesh.scale.set(0.9, 0.9, 0.9);
    container.add(wireframeMesh);

    let wireframeMaterialTwo = new THREE.MeshBasicMaterial({
      color: tinycolor("#CCFF00")
        .spin(Math.random() * 360)
        .toHexString(),
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    });
    let geometryTwo = new THREE.BoxGeometry(size, size, size, 2, 2, 2);
    let wireframeMeshTwo = new THREE.Mesh(geometryTwo, wireframeMaterialTwo);
    wireframeMeshTwo.scale.set(0.95, 0.95, 0.95);
    container.add(wireframeMeshTwo);

    return container;
  }
}
