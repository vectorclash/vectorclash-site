import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "gsap/all";
import "./LogoGrid.scss";
import HeadingIcon from "./HeadingIcon";

import jamba from "../images/logos/jamba.svg";
import walmart from "../images/logos/walmart.svg";
import microsoft from "../images/logos/microsoft.svg";
import churchs from "../images/logos/churchs.svg";
import jimmyjohns from "../images/logos/jimmyjohns.svg";
import monrovia from "../images/logos/monrovia.svg";
import subway from "../images/logos/subway.svg";
import vive from "../images/logos/vive.svg";
import juniper from "../images/logos/juniper.svg";
import sovos from "../images/logos/sovos.png";
import redrobin from "../images/logos/redrobin.svg";
import deltadental from "../images/logos/deltadental.svg";
import rocky from "../images/logos/rocky.svg";
import atlassian from "../images/logos/atlassian.svg";
import gap from "../images/logos/gap.svg";
import att from "../images/logos/att.svg";
// import winc from "../images/logos/winc.svg";

// Static data, so it lives outside the component rather than in state -- it
// never changes and nothing ever sets it.
const LOGOS = [
  { src: jamba, name: "Jamba Juice" },
  { src: walmart, name: "Walmart" },
  { src: microsoft, name: "Microsoft" },
  { src: churchs, name: "Church's Chicken" },
  { src: jimmyjohns, name: "Jimmy John's" },
  { src: monrovia, name: "Monrovia" },
  { src: subway, name: "Subway" },
  { src: gap, name: "Gap" },
  { src: att, name: "AT&T" },
  { src: juniper, name: "Juniper Networks" },
  { src: vive, name: "HTC Vive" },
  { src: sovos, name: "Sovos" },
  { src: redrobin, name: "Red Robin" },
  { src: deltadental, name: "Delta Dental" },
  { src: rocky, name: "Rocky Brands" },
  { src: atlassian, name: "Atlassian" },
];

function logoOver(e) {
  const logo = e.currentTarget;

  // Let a flip finish rather than restarting it under a twitchy cursor.
  if (gsap.isTweening(logo)) return;

  // Perspective lives on .logo-grid-item in CSS -- it is what keeps this
  // from reading as a flat horizontal squash, since without it a rotationY
  // is just a scale on X. The flip goes all the way around instead of
  // turning back at edge-on, and the logo pushes toward the viewer
  // through the middle of it.
  const tl = gsap.timeline();

  tl.fromTo(
    logo,
    { rotationY: 0 },
    {
      rotationY: 360,
      duration: 0.7,
      ease: "power2.inOut",
      transformOrigin: "50% 50%",
    }
  );

  tl.to(logo, { z: 90, scale: 1.12, duration: 0.35, ease: "power2.out" }, 0);
  tl.to(logo, { z: 0, scale: 1, duration: 0.35, ease: "power2.in" }, 0.35);

  // A small tilt that settles after the spin, so it lands with some weight
  // rather than snapping flat.
  tl.fromTo(
    logo,
    { rotationZ: 0 },
    { rotationZ: 6, duration: 0.35, ease: "power2.out" },
    0
  );
  tl.to(logo, { rotationZ: 0, duration: 0.5, ease: "back.out(3)" }, 0.35);
}

function LogoGrid() {
  const mountRef = useRef(null);

  useEffect(() => {
    const tl = gsap.timeline({ paused: true });

    tl.fromTo(mountRef.current, { alpha: 0 }, { alpha: 1, duration: 1, ease: "quad.inOut" });
    tl.fromTo(
      mountRef.current.querySelectorAll(".logo-grid-item"),
      { alpha: 0, y: 100 },
      {
        duration: 0.5,
        alpha: 1,
        y: 0,
        stagger: { amount: 1, grid: "auto", from: "start" },
        ease: "back.out",
      },
      0
    );

    const st = ScrollTrigger.create({
      trigger: mountRef.current,
      start: "top bottom",
      end: "top center",
      scrub: 1,
      animation: tl,
    });

    // The ScrollTrigger used to outlive the component -- only the timeline was
    // killed, leaving a trigger pointing at a detached element.
    return () => {
      st.kill();
      tl.kill();
    };
  }, []);

  return (
    <section className="logo-grid container" ref={mountRef}>
      <div className="column">
        <h3>Brands <HeadingIcon /></h3>
        <div className="logo-grid-container">
          {LOGOS.map((logo, i) => (
            <div className="logo-grid-item" key={i}>
              <img
                src={logo.src}
                alt={`${logo.name} logo`}
                loading="lazy"
                decoding="async"
                onMouseEnter={logoOver}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default LogoGrid;
