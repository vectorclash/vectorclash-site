import { useEffect, useMemo, useRef, useState } from "react";
import { gsap, SplitText, ScrollTrigger } from "gsap/all";
import tinycolor from "tinycolor2";

// The site's own layout and hero rules, rather than a second set written to
// look like them. App.scss is where .container, .column and the section
// headings live; Hero.scss is the type, the shadow and the button.
import "../App.scss";
import "../components/Hero.scss";
import "./BannerPortfolio.scss";

import HeroBackground from "../components/HeroBackground";
import Logo from "../components/Logo";
import HeadingIcon from "../components/HeadingIcon";
import ContactFooter from "../components/ContactFooter";
import BannerPreview from "./BannerPreview";
import clients from "../data/banners.json";
import profileData from "../data/profile.json";

gsap.registerPlugin(SplitText, ScrollTrigger);

// The creatives are the delivered HTML, served as static files; the posters
// are each one's resting frame, captured after its animation has finished.
const BASE = `${import.meta.env.BASE_URL}banners/`;
const creativeURL = (banner) => `${BASE}creatives/${banner.path}/index.html`;
const posterURL = (banner) => `${BASE}posters/${banner.path}.webp`;

// Hero.jsx's entrance, in the same order and on the same curves, so the page
// opens in the register the home page does. It has one line of copy under the
// headline rather than a split paragraph, so that line simply comes in whole.
function useHeaderEntrance(ref) {
  useEffect(() => {
    let tl = null;
    const splits = [];
    let cancelled = false;

    document.fonts.ready.then(() => {
      if (cancelled || !ref.current) return;

      const article = ref.current.querySelector("article");
      const [logo, h2, h1, p, buttons] = article.children;
      tl = gsap.timeline({ delay: 1 });

      tl.to(logo, { duration: 1, alpha: 1, ease: "quad.out" });

      gsap.set([h2, h1], { autoAlpha: 1 });
      const greeting = new SplitText(h2, { type: "words" });
      const title = new SplitText(h1, { type: "words" });
      splits.push(greeting, title);

      tl.fromTo(
        greeting.words,
        { x: 30, alpha: 0 },
        { duration: 0.5, x: 0, alpha: 1, ease: "elastic.out", stagger: { amount: 0.5 } }
      );
      tl.fromTo(
        title.words,
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
      tl.fromTo(p, { x: 30, alpha: 0 }, { duration: 0.6, x: 0, alpha: 1, ease: "back.out" });
      tl.fromTo(buttons, { alpha: 0, y: 30 }, { duration: 0.5, y: 0, alpha: 1, ease: "quad.out" });
    });

    return () => {
      cancelled = true;
      if (tl) tl.kill();
      splits.forEach((split) => split.revert());
    };
  }, [ref]);
}

// Scrubbed to the scroll like every other reveal on the site: the intro fades
// up, and each client comes in as a heading and then its shelf, left to right.
function useWallReveal(ref) {
  useEffect(() => {
    const wall = ref.current;
    const triggers = [];
    const timelines = [];

    const reveal = (target, build, end = "top 60%") => {
      const tl = gsap.timeline({ paused: true });
      build(tl);
      timelines.push(tl);
      triggers.push(
        ScrollTrigger.create({ trigger: target, start: "top bottom", end, scrub: 1, animation: tl })
      );
    };

    reveal(wall.querySelector(".banner-wall-intro"), (tl) =>
      tl.fromTo(
        wall.querySelector(".banner-wall-intro"),
        { alpha: 0, y: 20 },
        { alpha: 1, y: 0, duration: 1, ease: "quad.out" }
      )
    );

    wall.querySelectorAll(".banner-client").forEach((client) =>
      reveal(client, (tl) =>
        tl
          .fromTo(client, { alpha: 0 }, { alpha: 1, duration: 0.4, ease: "quad.inOut" })
          .fromTo(
            client.querySelector(".banner-client-name"),
            { alpha: 0, y: 10 },
            { alpha: 1, y: 0, duration: 0.5, ease: "quad.out" },
            0
          )
          .fromTo(
            client.querySelectorAll(".banner-tile"),
            { alpha: 0, y: 40 },
            { alpha: 1, y: 0, duration: 0.6, ease: "back.out", stagger: { amount: 0.4 } },
            0.15
          )
      )
    );

    return () => {
      triggers.forEach((trigger) => trigger.kill());
      timelines.forEach((tl) => tl.kill());
    };
  }, [ref]);
}

// The wall is a grid of equal columns, one per 300px of banner, with the gap a
// sixth of a column and the row unit a twelfth -- see BannerPortfolio.scss.
// Everything a tile needs to know about its place follows from its own size:
// how many columns it takes, and so how many rows its height comes to at that
// width. A leaderboard would be three-quarters of a column wide at true scale
// relative to the rest, and its copy unreadable, so it takes three.
const GAP = 1 / 6;
const ROW = 1 / 12;
const GAP_ROWS = GAP / ROW;

const columnSpan = (banner) => (banner.width >= 700 ? 3 : banner.width >= 600 ? 2 : 1);

// How much of its column a one-column banner fills. Anything from 300 to 340
// wide fills it; a 160x600 skyscraper takes its true share instead, which
// keeps it from being drawn nearly twice the width it ran at.
const columnFill = (banner, span) => (span === 1 ? Math.min(1, banner.width / 300) : 1);

// Rows for a tile spanning `span` columns: its height at the width it is
// drawn, rounded up to whole rows, and the gap below it.
const rowSpan = (banner, span) => {
  const width = (span + (span - 1) * GAP) * columnFill(banner, span);
  return Math.ceil((width * banner.height) / banner.width / ROW - 0.01) + GAP_ROWS;
};

function BannerTile({ banner, client, onOpen }) {
  const { width, height } = banner;
  const span = columnSpan(banner);

  return (
    <li
      className={`banner-tile${span === 3 ? " is-wide" : ""}`}
      style={{
        "--span": span,
        "--fill": columnFill(banner, span),
        "--rows": rowSpan(banner, span),
        // Where the wall is only two columns wide, a three-column tile is
        // held to two, and is shorter for it.
        "--rows-narrow": rowSpan(banner, Math.min(span, 2)),
      }}
    >
      <button type="button" className="banner-tile-frame" onClick={onOpen}>
        <img
          src={posterURL(banner)}
          width={width}
          height={height}
          alt={`${client}: ${banner.title}, ${width} by ${height}`}
          loading="lazy"
          decoding="async"
        />
        <span className="banner-tile-play" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M8 5.5v13l10.5-6.5z" />
          </svg>
        </span>
        <span className="banner-tile-caption" aria-hidden="true">
          <span className="banner-tile-title">{banner.title}</span>
          <span className="banner-tile-size">
            {width}&times;{height}
          </span>
        </span>
      </button>
    </li>
  );
}

export default function BannerPortfolio() {
  const headerRef = useRef(null);
  const wallRef = useRef(null);
  const [open, setOpen] = useState(null);

  useHeaderEntrance(headerRef);
  useWallReveal(wallRef);

  // The glow the preview throws around a playing banner. It was a fixed hot
  // pink; it is one hue off the brand chartreuse now, rolled once per visit,
  // which is how every other accent on the site picks its colour.
  const glow = useMemo(
    () => tinycolor("#CCFF00").spin(Math.random() * 360).setAlpha(0.45).toRgbString(),
    []
  );

  return (
    <div className="App banner-portfolio">
      <header className="hero banners-hero container" ref={headerRef}>
        <article className="column">
          <Logo />
          <h2>{profileData.name.full}</h2>
          <h1>
            <b>HTML5 Banner Portfolio</b>
          </h1>
          <p>Animated display advertising, every unit live and playable at its actual size.</p>
          <div className="hero-buttons">
            <a href={import.meta.env.BASE_URL}>
              <svg viewBox="0 0 320 512" aria-hidden="true">
                <path d="M34.5 239 228.9 44.7a24 24 0 0 1 33.9 0l22.7 22.7a24 24 0 0 1 0 33.9L131.5 256l154 154.8a24 24 0 0 1 0 33.9l-22.7 22.7a24 24 0 0 1-33.9 0L34.5 273a24 24 0 0 1 0-34z" />
              </svg>
              Main portfolio
            </a>
          </div>
        </article>
        <HeroBackground />
      </header>

      <main className="banner-wall container" ref={wallRef}>
        <div className="column">
          <div className="banner-wall-intro">
            <h3>
              Display advertising <HeadingIcon />
            </h3>
            <p>
              Display advertising is animation under constraint. Each of these units had to carry
              its message inside a hard filesize budget and the specification of whichever ad
              platform would serve it, and to come to rest on a final frame that still works as a
              static advertisement once the motion has stopped.
            </p>
            <p>
              I build them in GSAP as a rule, and in Adobe Animate when the choreography calls for
              a timeline rather than code. What follows is the delivered creative rather than a
              recording of it: select any banner to play it live at its actual size.
            </p>
          </div>

          {clients.map(({ client, banners }) => (
            <section className="banner-client" key={client} aria-label={client}>
              <h4 className="banner-client-name">{client}</h4>
              <ul className="banner-shelf">
                {banners.map((banner) => (
                  <BannerTile
                    key={banner.path}
                    banner={banner}
                    client={client}
                    onOpen={() => setOpen({ banner, client })}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>

      <ContactFooter />

      {open && (
        <BannerPreview
          banner={open.banner}
          client={open.client}
          src={creativeURL(open.banner)}
          glow={glow}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
