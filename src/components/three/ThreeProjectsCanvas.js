import * as THREE from "three";
import gsap from "gsap/all";
import tinycolor from "tinycolor2";
import ProjectShape from "./ProjectShape";
import VideoShape from "./VideoShape";

export default class ThreeProjectsCanvas {
  constructor(width, height) {
    // create the renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height + 1);
    this.renderer.setClearColor(0x00ccff, 1);
    this.renderer.precision = "highp";

    // set default camera position for later retrieval
    this.cameraDefaultPosition = { x: 0, y: 2, z: 160 };
    this.cameraDefaultRotation = { x: 0, y: 0, z: 0 };

    // create the camera
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 20000);
    this.camera.position.x = this.cameraDefaultPosition.x;
    this.camera.position.y = this.cameraDefaultPosition.y;
    this.camera.position.z = this.cameraDefaultPosition.z;
    this.camera.rotation.x = this.cameraDefaultRotation.x;
    this.camera.rotation.y = this.cameraDefaultRotation.y;
    this.camera.rotation.z = this.cameraDefaultRotation.z;

    // create the scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xfb0097, 1, 1400);

    this.projectContainer = new THREE.Group();
    this.scene.add(this.projectContainer);

    this.videoContainer = new THREE.Group();
    this.scene.add(this.videoContainer);

    // create some lights
    this.ambientLight = new THREE.AmbientLight(0xfafafa, 1.5);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0x00ccff, 1);
    this.scene.add(this.directionalLight);

    this.doRender = false;
    gsap.ticker.add(this.render.bind(this));

    window.addEventListener("scroll", this.onScroll.bind(this));

    // reset the projection matrix on resize
    window.addEventListener("resize", this.onResize.bind(this), false);

    return this;
  }

  addProject(texture) {
    let newColor = tinycolor("#CCFF00").spin(Math.random() * 360);
    this.renderer.setClearColor(newColor.toHexString(), 1);
    this.scene.fog = new THREE.Fog(newColor.toHexString(), 1, 1400);
    this.clearProjects();

    let newProject = new ProjectShape(300, texture);
    gsap.from(newProject.scale, {
      duration: 0.5,
      x: 0.8,
      y: 0.8,
      z: 0.8,
      ease: "quad.inOut",
    });

    gsap.from(newProject.children[0].material, {
      duration: 0.5,
      opacity: 0,
      ease: "quad.inOut",
    });

    this.projectContainer.add(newProject);

    document.querySelector(".project-text").style.borderBottomColor = newColor
      .setAlpha(0.4)
      .toRgbString();
  }

  changeVideo(url) {
    this.deleteChild(this.videoContainer);
    if (url) {
      let newVideo = new VideoShape(url, 50);
      newVideo.position.x = 70;
      newVideo.position.y = 50;
      this.videoContainer.add(newVideo);
    }
  }

  clearProjects() {
    if (this.projectContainer.children[0]) {
      gsap.to(this.projectContainer.children[0].scale, {
        duration: 0.5,
        x: 1.2,
        y: 1.2,
        z: 1.2,
        ease: "quad.inOut",
        onComplete: () => {
          this.deleteChild(this.projectContainer);
        },
      });
    }
  }

  deleteChild(container) {
    if (container.children[0]) {
      container.remove(container.children[0]);
    }
  }

  ranCoordinates(range) {
    return -(range / 2) + Math.random() * range;
  }

  onScroll() {
    gsap.to(this.camera.position, {
      duration: 0.5,
      y: this.renderer.domElement.parentNode.getBoundingClientRect().y * 0.13,
      ease: "quad.out",
    });
  }

  onResize() {
    this.camera.aspect =
      this.renderer.domElement.parentNode.offsetWidth /
      this.renderer.domElement.parentNode.offsetHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(
      this.renderer.domElement.parentNode.offsetWidth,
      this.renderer.domElement.parentNode.offsetHeight + 1
    );
  }

  elementInViewport(el) {
    let top = el.offsetTop;
    let left = el.offsetLeft;
    let width = el.offsetWidth;
    let height = el.offsetHeight;

    while (el.offsetParent) {
      el = el.offsetParent;
      top += el.offsetTop;
      left += el.offsetLeft;
    }

    return (
      top < window.pageYOffset + window.innerHeight &&
      left < window.pageXOffset + window.innerWidth &&
      top + height > window.pageYOffset &&
      left + width > window.pageXOffset
    );
  }

  render() {
    if (this.doRender && this.elementInViewport(this.renderer.domElement)) {
      this.renderer.render(this.scene, this.camera);

      this.projectContainer.rotation.x += 0.001;
      this.projectContainer.rotation.y += 0.0008;
      this.projectContainer.rotation.z -= 0.0009;

      this.videoContainer.rotation.x -= 0.001;
      this.videoContainer.rotation.y -= 0.0008;
      this.videoContainer.rotation.z += 0.0009;
    }
  }
}
