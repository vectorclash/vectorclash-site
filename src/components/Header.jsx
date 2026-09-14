import { useEffect, useRef } from "react";
import { gsap, SplitText, ScrollTrigger } from "gsap/all";
import "./Header.scss";
import PDFIcon from "./PDFIcon";
import ThreeHeaderBackground from "./ThreeHeaderBackground";
import Logo from "./Logo";
import profileData from "../data/profile.json";

gsap.registerPlugin(SplitText, ScrollTrigger);

function Header() {
  const myRef = useRef(null);

  // Only a width change relocks the height. On mobile the address bar
  // collapsing fires resize with a new innerHeight, and relocking on that
  // would make the hero jump mid-scroll.
  useEffect(() => {
    let lastWidth = window.innerWidth;

    const lockHeaderHeight = () => {
      if (window.innerWidth <= 600 && myRef.current) {
        const h = window.innerHeight;
        myRef.current.style.height = `${h}px`;
        myRef.current.style.minHeight = `${h}px`;
      }
    };

    lockHeaderHeight();

    const onResize = () => {
      if (window.innerWidth !== lastWidth) {
        lastWidth = window.innerWidth;
        lockHeaderHeight();
      }
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // The entrance waits on document.fonts.ready, which can resolve after
  // unmount, so the timeline and the splits are held for the cleanup to undo.
  useEffect(() => {
    let tl = null;
    const splits = [];
    let cancelled = false;

    const animateElements = () => {
      if (cancelled || !myRef.current) return;

      const article = myRef.current.querySelector("article");
      tl = gsap.timeline({ delay: 1 });

      tl.to(article.children[0], {
        duration: 1,
        alpha: 1,
        ease: "quad.out",
      });

      // Each element is made visible only once its words have been split,
      // otherwise the unsplit line flashes in at full opacity first.
      const h2Element = article.children[1];
      gsap.set(h2Element, { autoAlpha: 1 });

      const headlineSplit1 = new SplitText(h2Element, { type: "words" });
      splits.push(headlineSplit1);

      tl.fromTo(
        headlineSplit1.words,
        { x: 30, alpha: 0 },
        {
          duration: 0.5,
          x: 0,
          alpha: 1,
          ease: "elastic.out",
          stagger: { amount: 0.5 },
        }
      );

      const h1Element = article.children[2];
      gsap.set(h1Element, { autoAlpha: 1 });

      const headlineSplit2 = new SplitText(h1Element, { type: "words" });
      splits.push(headlineSplit2);

      tl.fromTo(
        headlineSplit2.words,
        { y: -30, scaleY: 0.5, rotation: -20, skewY: 20, alpha: 0 },
        {
          duration: 0.5,
          y: 0,
          scaleY: 1,
          rotation: 0,
          skewY: 0,
          alpha: 1,
          ease: "bounce.out",
          stagger: { amount: 0.5 },
        }
      );

      const pElement = myRef.current.querySelector("p");
      gsap.set(pElement, { autoAlpha: 1 });

      // .nowrap is left whole so the closing words cannot break apart and
      // strand a single word on its own line at narrow widths.
      const subHeadlineSplit = new SplitText(pElement, {
        type: "words",
        ignore: ".nowrap",
      });
      splits.push(subHeadlineSplit);

      // An ignored element is left out of split.words, so it has to be added
      // back as a target by hand -- it sits last in the paragraph, which keeps
      // the stagger in reading order.
      const subHeadlineTargets = [
        ...subHeadlineSplit.words,
        ...pElement.querySelectorAll(".nowrap"),
      ];

      tl.fromTo(
        subHeadlineTargets,
        { x: 30, alpha: 0 },
        {
          duration: 0.5,
          x: 0,
          alpha: 1,
          ease: "back.out",
          stagger: { amount: 0.5 },
        }
      );

      tl.fromTo(
        myRef.current.querySelector(".header-buttons"),
        { alpha: 0, y: 30 },
        { duration: 0.5, y: 0, alpha: 1, ease: "quad.out" }
      );
    };

    document.fonts.ready.then(animateElements);

    return () => {
      cancelled = true;
      if (tl) tl.kill();
      splits.forEach((split) => split.revert());
    };
  }, []);

  return (
    <header className="header container" ref={myRef}>
      <article className="column">
        <Logo />
        <h2>{profileData.greeting}</h2>
        <h1>
          <b>{profileData.name.full}</b>
        </h1>
        <p dangerouslySetInnerHTML={{ __html: profileData.intro }} />
        <div className="header-buttons">
          <a
            href={profileData.resume.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {profileData.resume.text} {<PDFIcon />}
          </a>
        </div>
      </article>
      <ThreeHeaderBackground />
    </header>
  );
}

export default Header;
