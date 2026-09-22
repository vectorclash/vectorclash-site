import { useEffect, useMemo, useRef } from "react";
import { gsap, SplitText, ScrollTrigger } from "gsap/all";
import tinycolor from "tinycolor2";
import "./About.scss";
import me from "../images/me.png";
import HeadingIcon from "./HeadingIcon";
import skillsData from "../data/skills.json";

// The shimmer runs off a class rather than :hover so that rolling off
// mid-sweep does not cut it short -- the class is only dropped once the
// animation reports itself finished.
function shimmer(pill) {
  if (!pill || pill.classList.contains("is-shimmering")) return;

  pill.classList.add("is-shimmering");
  pill.addEventListener(
    "animationend",
    () => pill.classList.remove("is-shimmering"),
    { once: true }
  );
}

// A mouse gets the sweep on rollover. A tap fires pointerenter too, but only
// the first time -- the pill stays "entered" until the finger lands somewhere
// else, so a second tap on the same pill would enter nothing. Touch is driven
// off pointerdown instead, which fires on every tap.
function onSkillPointerEnter(e) {
  if (e.pointerType === "mouse") shimmer(e.currentTarget);
}

function onSkillPointerDown(e) {
  if (e.pointerType !== "mouse") shimmer(e.currentTarget);
}

function About() {
  const mount = useRef(null);

  // One tetrad off a randomly spun chartreuse, picked once per load --
  // the same palette trick the old gradient skill bars used. Here the
  // whole four-colour ramp becomes the band that swipes across a pill on
  // rollover, so the pills themselves stay as they were at rest.
  const shimmerGradient = useMemo(() => {
    const palette = tinycolor("#CCFF00")
      .spin(Math.random() * 360)
      .tetrad()
      .map((color) => color.toHexString());

    return (
      "linear-gradient(105deg, transparent 28%, " +
      palette.map((color, i) => `${color} ${38 + i * 6}%`).join(", ") +
      ", transparent 72%)"
    );
  }, []);

  useEffect(() => {
    const skillContainer = mount.current.querySelector(".skills");
    const aboutContainer = mount.current.querySelector(".about-text");

    let skillsTl = null;
    let aboutTl = null;
    let aboutTrigger = null;
    let aboutSplit = null;
    const triggers = [];
    let meMounted = false;
    let cancelled = false;

    const buildSkillsTimeline = () => {
      const tl = gsap.timeline({ paused: true });

      tl.fromTo(skillContainer, { alpha: 0 }, { alpha: 1, duration: 1, ease: "quad.inOut" });

      const groups = skillContainer.querySelectorAll(".skill-group");
      groups.forEach((group, i) => {
        const pos = 0.5 + i * 0.3;
        tl.fromTo(
          group.querySelector(".skill-category"),
          { alpha: 0, y: 10 },
          { duration: 0.5, alpha: 1, y: 0, ease: "quad.out" },
          pos
        );
        tl.fromTo(
          group.querySelectorAll("li"),
          // The sweep is a property of the same tween rather than a second
          // animation chased after it, so a pill scales up, fades in and
          // takes the shimmer as one movement -- and the palette introduces
          // itself on touch devices that never get a rollover.
          { alpha: 0, y: 8, scale: 0.9, "--pill-shimmer-pos": "150%" },
          {
            duration: 0.5,
            alpha: 1,
            y: 0,
            scale: 1,
            "--pill-shimmer-pos": "-50%",
            ease: "back.out",
            stagger: { amount: 0.25 },
          },
          pos + 0.15
        );
      });

      return tl;
    };

    // A line split wraps each line of the paragraph in its own element, and
    // those elements keep the words they were given at the width the split ran
    // at. Narrow the window afterwards and every one of them wraps again
    // inside itself, which is how the copy ended up ragged -- a long line, a
    // stranded half line, a long line. autoSplit re-runs the split when the
    // width changes, and onSplit rebuilds what was animating the old lines.
    //
    // The timeline and its trigger are rebuilt together, because a
    // ScrollTrigger cannot be handed a different animation after the fact.
    // Returning the timeline lets SplitText revert it before the next split.
    const buildAboutTimeline = (lines) => {
      if (aboutTrigger) aboutTrigger.kill();
      if (aboutTl) aboutTl.kill();

      const tl = gsap.timeline({ paused: true });

      tl.fromTo(aboutContainer, { alpha: 0 }, { alpha: 1, duration: 1, ease: "quad.inOut" });
      tl.from(
        lines,
        {
          duration: 0.5,
          y: 10,
          alpha: 0,
          ease: "back.out",
          stagger: { amount: 1 },
        },
        0.5
      );

      aboutTl = tl;
      aboutTrigger = ScrollTrigger.create({
        trigger: aboutContainer,
        start: "top bottom",
        end: "top top",
        scrub: 1,
        animation: tl,
        onEnter: () => {
          if (!meMounted) {
            meMounted = true;
            animateMe();
          }
        },
      });

      return tl;
    };

    const animateMe = () => {
      if (cancelled || !mount.current) return;

      gsap.to(".geometric-me", {
        duration: 5 + Math.random() * 10,
        x: Math.random() * aboutContainer.clientWidth,
        y: Math.random() * aboutContainer.clientHeight,
        alpha: Math.random() * 0.4,
        ease: "quad.inOut",
        onComplete: animateMe,
      });
    };

    document.fonts.ready.then(() => {
      if (cancelled) return;

      skillsTl = buildSkillsTimeline();

      triggers.push(
        ScrollTrigger.create({
          trigger: skillContainer,
          start: "top bottom",
          end: "top top",
          scrub: 1,
          animation: skillsTl,
        })
      );

      // onSplit runs for the first split as well as every re-split, so this is
      // also what builds the about timeline to begin with.
      aboutSplit = SplitText.create(aboutContainer.querySelectorAll("p"), {
        type: "lines",
        autoSplit: true,
        onSplit: (self) => buildAboutTimeline(self.lines),
      });
    });

    // The ScrollTriggers used to outlive the component -- only the timelines
    // were killed, leaving two triggers pointing at detached elements.
    return () => {
      cancelled = true;
      triggers.forEach((trigger) => trigger.kill());
      if (skillsTl) skillsTl.kill();
      if (aboutTrigger) aboutTrigger.kill();
      if (aboutTl) aboutTl.kill();
      if (aboutSplit) aboutSplit.revert();
      gsap.killTweensOf(".geometric-me");
    };
  }, []);

  return (
    <section className="about container" ref={mount}>
      <div className="column">
        <article className="skills" style={{ "--pill-shimmer": shimmerGradient }}>
          <h3>Skills <HeadingIcon /></h3>
          {skillsData.map((skillGroup) => (
            <div
              key={skillGroup.category}
              className={
                "skill-group" + (skillGroup.secondary ? " skill-group-secondary" : "")
              }
            >
              <h4 className="skill-category">{skillGroup.category}</h4>
              <ul className="skill-list">
                {skillGroup.items.map((skill) => (
                  <li
                    key={skill}
                    onPointerEnter={onSkillPointerEnter}
                    onPointerDown={onSkillPointerDown}
                  >
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </article>
          <article className="about-text">
            <h3>Practice <HeadingIcon /></h3>
            <div>
              <p>I am a design engineer working at the seam between interface design and the code that makes it move. Over the past decade I have built interactive and animated work for Microsoft, Walmart, Atlassian, Gap, AT&amp;T, HTC Vive, and Subway &mdash; a permanent touch installation in Gap's San Francisco headquarters at one end of that range, an audio-reactive projection system for a live dancefloor at the other. The common thread is motion that carries meaning rather than motion applied as decoration.</p>
              <p>Advertising work is one of the longer strands of the practice. For AT&amp;T I built animated banners and social video at campaign volume, where every unit had to land on-brand inside a hard filesize budget and whatever specification the ad platform or channel imposed &mdash; GSAP and Adobe Animate for the interactive units, After Effects for the video. The more durable half of that engagement was the automation I built to take the resizing and exporting over, so the constraint work stopped being done by hand. Chromaforge, my own app, renders its own promotional video in the browser rather than in After Effects, which comes out of the same habit.</p>
              <p>Most of my work lives in the browser, in React and GSAP, and increasingly three.js when an idea calls for real-time 3D. I care about the engineering underneath the surface: the 3D scenes here scale their effects to the visitor's GPU, and the scroll choreography survives a mobile address bar collapsing mid-gesture. The other half of the practice is design proper &mdash; Figma, and a long-running interest in color as a system rather than a palette, which is where Chromaforge came from. It has since grown into a print-on-demand product with real users.</p>
              <p>
                A selection of the banner work is collected separately:{" "}
                <a href="./banners/">
                  HTML5 Banner Portfolio
                </a>
                .
              </p>
            </div>
            <img src={me} className="geometric-me" alt="" aria-hidden="true" />
          </article>
      </div>
    </section>
  );
}

export default About;
