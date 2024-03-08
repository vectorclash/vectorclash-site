import * as THREE from "three";
import gsap from "gsap/all";
import tinycolor from "tinycolor2";

export default class VideoShape {
  constructor(url, size) {
    this.videoHasPlayed = false;

    this.container = new THREE.Object3D();

    let geometry = new THREE.TetrahedronGeometry(size);

    this.videoElement = document.createElement("video");
    this.videoElement.setAttribute("autoplay", "");
    this.videoElement.setAttribute("loop", "");
    this.videoElement.setAttribute("muted", "");
    this.videoElement.setAttribute("playsinline", "");
    this.videoElement.setAttribute("crossorigin", "anonymous");

    let sourceElement = document.createElement("source");
    sourceElement.src = url;
    sourceElement.type = "video/mp4";
    this.videoElement.appendChild(sourceElement);

    let videoTexture = new THREE.VideoTexture(this.videoElement);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBAFormat;

    let material = new THREE.MeshBasicMaterial({
      map: videoTexture,
      color: 0xffffff,
    });

    let placeholderMaterial = new THREE.MeshStandardMaterial({
      color: tinycolor.random().toHexString(),
      flatShading: true,
    });

    this.placeholderMesh = new THREE.Mesh(geometry, placeholderMaterial);
    this.placeholderMesh.scale.set(0.9, 0.9, 0.9);
    this.container.add(this.placeholderMesh);

    this.mesh = new THREE.Mesh(geometry, material);

    this.videoElement.addEventListener("canplay", this.animateIn.bind(this));
    this.videoElement.addEventListener("ended", this.replayVideo.bind(this));

    return this.container;
  }

  replayVideo(event) {
    this.videoElement.play();
  }

  animateIn(event) {
    if (this.videoHasPlayed) {
      return;
    }

    this.container.add(this.mesh);

    gsap.from(this.mesh.scale, {
      duration: 1,
      x: 0.0001,
      y: 0.0001,
      z: 0.0001,
      ease: "back.out",
    });

    gsap.to(this.placeholderMesh.scale, {
      duration: 1,
      x: 0.0001,
      y: 0.0001,
      z: 0.0001,
      ease: "back.in",
    });

    this.videoElement.muted = true;
    this.videoElement.play();
    this.videoHasPlayed = true;
  }
}
