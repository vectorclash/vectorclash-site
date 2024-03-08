import * as THREE from "three";
import gsap from "gsap/all";
import ParticleField from "./ParticleField";
import ShapeSwarm from "./ShapeSwarm";
import BrightCluster from "./BrightCluster";
import WireframeBox from "./WireframeBox";
import StarLarge from "../../images/star-sprite-large.png";
import StarSmall from "../../images/star-sprite-small.png";

export default class ThreeCanvas {
  constructor(width, height, colors) {
    this.middleColor = Math.floor(colors.length / 2);

    // create the renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0xccff00, 0);

    // set default camera position for later retrieval
    this.cameraDefaultPosition = { x: 0, y: 2, z: 130 };
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
    this.scene.fog = new THREE.Fog(
      colors[this.middleColor].toHexString(),
      1,
      450
    );

    this.mainContainer = new THREE.Group();
    this.scene.add(this.mainContainer);

    gsap.from(this.mainContainer.scale, {
      duration: 6,
      x: 0.00002,
      y: 0.00002,
      z: 0.00002,
      ease: "back.out",
      delay: 1,
    });

    // create some lights
    this.ambientLight = new THREE.AmbientLight(0xfafafa, 1);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(
      colors[this.middleColor].toHexString(),
      0.5
    );
    this.scene.add(this.directionalLight);

    // add some shapes
    this.mainContainer.add(
      new WireframeBox(2000, 12, colors[this.middleColor].toHexString())
    );
    this.mainContainer.add(new ShapeSwarm(5, { x: 120, y: 200, z: 50 }));
    this.mainContainer.add(new ShapeSwarm(5, { x: 30, y: 75, z: 20 }));
    let brightCluster = new BrightCluster();
    this.mainContainer.add(brightCluster);

    let starLoaderSmall = new THREE.ImageLoader();
    starLoaderSmall.load(StarSmall, (image) => {
      this.buildParticles(image, "small");
    });

    let starLoaderLarge = new THREE.ImageLoader();
    starLoaderLarge.load(StarLarge, (image) => {
      this.buildParticles(image, "large");
    });

    gsap.ticker.add(this.render.bind(this));

    window.addEventListener("scroll", this.onScroll.bind(this));

    // reset the projection matrix on resize
    window.addEventListener("resize", this.onWindowResize.bind(this), false);

    return this.renderer.domElement;
  }

  buildParticles(image, imageSize) {
    let size;
    let amount;

    if (imageSize === "small") {
      for (let i = 0; i < 50; i++) {
        size = 0.5 + Math.random() * 1;
        amount = 500;
        let particles = new ParticleField(amount, image, size, 0.4, {
          x: 200,
          y: 250,
          z: 200,
        });
        this.mainContainer.add(particles.particleSystem);
        this.animateParticles(particles);
      }
    } else if (imageSize === "large") {
      for (let i = 0; i < 20; i++) {
        size = 10 + Math.random() * 30;
        amount = 5;
        let particles = new ParticleField(amount, image, size, 0.7, {
          x: 150,
          y: 150,
          z: 150,
        });
        this.mainContainer.add(particles.particleSystem);
        this.animateParticles(particles);
      }
    }
  }

  animateParticles(particles) {
    gsap.from(particles.particleSystem.material, {
      duration: 2,
      opacity: 0,
      size: 0,
      ease: "quad.inOut",
      delay: 0.5,
    });

    gsap.to(particles.particleSystem.scale, {
      duration: 30 + Math.random() * 20,
      x: 1 + Math.random() * 2,
      yoyo: true,
      repeat: -1,
      ease: "back.inOut",
    });

    gsap.to(particles.particleSystem.scale, {
      duration: 30 + Math.random() * 20,
      y: 1 + Math.random() * 2,
      yoyo: true,
      repeat: -1,
      ease: "back.inOut",
    });

    gsap.to(particles.particleSystem.scale, {
      duration: 30 + Math.random() * 20,
      z: 1 + Math.random() * 2,
      yoyo: true,
      repeat: -1,
      ease: "back.inOut",
    });

    gsap.to(particles.particleSystem.rotation, {
      duration: 100,
      y: -Math.PI * 2,
      repeat: -1,
      ease: "none",
    });
  }

  onScroll() {
    gsap.to(this.camera.position, {
      duration: 0.5,
      y:
        -(
          window.scrollY -
          this.renderer.domElement.parentNode.getBoundingClientRect().y
        ) * 0.15,
      ease: "quad.out",
    });

    gsap.to(this.mainContainer.rotation, {
      duration: 0.5,
      y:
        -(
          window.scrollY -
          this.renderer.domElement.parentNode.getBoundingClientRect().y
        ) * 0.0007,
      ease: "quad.out",
    });
  }

  onWindowResize() {
    this.camera.aspect =
      this.renderer.domElement.parentNode.offsetWidth /
      this.renderer.domElement.parentNode.offsetHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(
      this.renderer.domElement.parentNode.offsetWidth,
      this.renderer.domElement.parentNode.offsetHeight
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
    if (this.elementInViewport(this.renderer.domElement)) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
