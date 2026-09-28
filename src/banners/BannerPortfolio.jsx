import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
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

    for (const selector of [".banner-wall-intro", ".banner-index"]) {
      const el = wall.querySelector(selector);
      reveal(el, (tl) =>
        tl.fromTo(el, { alpha: 0, y: 20 }, { alpha: 1, y: 0, duration: 1, ease: "quad.out" })
      );
    }

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
          // Only the preview is on the page when this is built. Tiles a
          // "Show all" adds bring their own entrance, so the two never fight.
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

// "AT&T" -> "att", "Bowers & Wilkins" -> "bowers-wilkins": the anchor each
// client's section answers to, from the index and from a shared link.
export const clientId = (client) =>
  client
    .toLowerCase()
    .replace(/&/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// How much of a client shows before "Show all": its lead campaign in every
// size it ran at, and never fewer than four tiles, so the preview reads as a
// set rather than a fragment. Where only a couple would be held back, nothing
// is -- a button to reveal two banners costs more than the two banners.
const PREVIEW_MIN = 4;
const HELD_BACK_MIN = 3;

const previewCount = (banners) => {
  const leadEnds = banners.findIndex((b) => b.title !== banners[0].title);
  const count = Math.max(leadEnds === -1 ? banners.length : leadEnds, PREVIEW_MIN);
  return banners.length - count >= HELD_BACK_MIN ? count : banners.length;
};

const SHELF_MOVE = { duration: 0.6, ease: "power3.inOut" };

function BannerClient({ client, banners, onOpen }) {
  const [expanded, setExpanded] = useState(false);
  const sectionRef = useRef(null);
  const shelfRef = useRef(null);
  const preview = previewCount(banners);
  const shown = expanded ? banners : banners.slice(0, preview);
  const id = clientId(client);

  // The shelf's height is tweened between the two layouts rather than snapped,
  // and the page's scroll triggers are re-measured once it lands: everything
  // below this client has moved, the footer's reveal included.
  const settle = (from) => {
    const shelf = shelfRef.current;
    gsap.fromTo(
      shelf,
      { height: from, overflow: "hidden" },
      {
        ...SHELF_MOVE,
        height: shelf.offsetHeight,
        clearProps: "height,overflow",
        onComplete: () => ScrollTrigger.refresh(),
      }
    );
  };

  const toggle = () => {
    const shelf = shelfRef.current;
    const from = shelf.offsetHeight;

    if (!expanded) {
      flushSync(() => setExpanded(true));
      settle(from);
      gsap.fromTo(
        [...shelf.children].slice(preview),
        { alpha: 0, y: 30 },
        { alpha: 1, y: 0, duration: 0.5, ease: "back.out", stagger: { amount: 0.4 }, delay: 0.1 }
      );
      return;
    }

    // Closing, the extra tiles fade before the shelf closes over them, so
    // nothing is cut off mid-tile. A long client closed from its button leaves
    // its heading above the screen, so the page comes back up to it.
    gsap.to([...shelf.children].slice(preview), {
      alpha: 0,
      duration: 0.2,
      ease: "quad.in",
      onComplete: () => {
        flushSync(() => setExpanded(false));
        settle(from);
        if (sectionRef.current.getBoundingClientRect().top < 0) {
          sectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      },
    });
  };

  return (
    <section className="banner-client" id={id} ref={sectionRef} aria-label={client}>
      <h4 className="banner-client-name">
        {client} <span className="banner-client-count">{banners.length}</span>
      </h4>
      <ul className="banner-shelf" id={`${id}-shelf`} ref={shelfRef}>
        {shown.map((banner) => (
          <BannerTile
            key={banner.path}
            banner={banner}
            client={client}
            onOpen={() => onOpen({ banner, client })}
          />
        ))}
      </ul>
      {preview < banners.length && (
        <button
          type="button"
          className="banner-client-more"
          aria-expanded={expanded}
          aria-controls={`${id}-shelf`}
          onClick={toggle}
        >
          {expanded ? "Show fewer" : `Show all ${banners.length}`}
          <svg viewBox="0 0 448 512" aria-hidden="true">
            <path d="M201.4 374.6a32 32 0 0 0 45.3 0l160-160a32 32 0 0 0-45.3-45.3L224 306.7 86.6 169.4a32 32 0 0 0-45.3 45.3l160 160z" />
          </svg>
        </button>
      )}
    </section>
  );
}

// The index scrolls rather than jumps, and leaves the address pointing at the
// client, so a link to /banners/#att can be shared and lands where it says.
function jumpTo(event) {
  event.preventDefault();
  const id = event.currentTarget.hash.slice(1);
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  history.replaceState(null, "", `#${id}`);
}

export default function BannerPortfolio() {
  const headerRef = useRef(null);
  const wallRef = useRef(null);
  const [open, setOpen] = useState(null);

  useHeaderEntrance(headerRef);
  useWallReveal(wallRef);

  // A shared link to a client: the browser tries the anchor before any of the
  // page exists, so it is honoured again once the wall is in place.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, []);

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

          <nav className="banner-index" aria-label="Clients">
            <ul>
              {clients.map(({ client, banners }) => (
                <li key={client}>
                  <a href={`#${clientId(client)}`} onClick={jumpTo}>
                    {client} <span>{banners.length}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {clients.map(({ client, banners }) => (
            <BannerClient key={client} client={client} banners={banners} onOpen={setOpen} />
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
