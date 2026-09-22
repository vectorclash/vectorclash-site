import { useRef, useState } from "react";
import HeroBackground from "../components/HeroBackground";
import Logo from "../components/Logo";
import "./Capture.scss";

// The Open Graph card. The frame is laid out at exactly this size, so the scene
// frames the card the way it will be seen rather than being cropped after.
const WIDTH = 1200;
const HEIGHT = 630;

// The logo's scale, measured off the og-image this replaces: a 367px ring,
// 10px thick. Capture.scss holds the same number for the live overlay, along
// with the ring weight, which the export reads back off the live strokes.
const LOGO_SCALE = 1.235;

// The ring's centre in the logo's own units, and a box around it wide enough
// for the thickened stroke. The logo's viewBox is narrower than the ring --
// it relies on overflow: visible -- and a rasterised SVG gets no overflow, so
// the export reframes it on the ring instead.
const RING_CENTRE = 180;
const RING_BOX = 152;

const LOGO_MODES = [
  { id: "off", label: "Off" },
  { id: "animated", label: "Animated" },
  { id: "white", label: "White" },
];

// The logo's strokes are set inline by its animation and by stylesheets both,
// so the clone is handed the resolved values -- an SVG drawn as an image sees
// none of the page's CSS.
const STROKE_PROPS = [
  "stroke",
  "stroke-width",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "fill",
];

function serializeLogo(svg) {
  const clone = svg.cloneNode(true);
  const from = svg.querySelectorAll("line, path");
  const to = clone.querySelectorAll("line, path");

  from.forEach((el, i) => {
    const style = getComputedStyle(el);
    STROKE_PROPS.forEach((prop) =>
      to[i].style.setProperty(prop, style.getPropertyValue(prop))
    );
  });

  const size = RING_BOX * 2 * LOGO_SCALE;
  clone.setAttribute(
    "viewBox",
    `${RING_CENTRE - RING_BOX} ${RING_CENTRE - RING_BOX} ${RING_BOX * 2} ${RING_BOX * 2}`
  );
  clone.setAttribute("width", size);
  clone.setAttribute("height", size);

  return new XMLSerializer().serializeToString(clone);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function download(canvas) {
  const stamp = new Date().toTimeString().slice(0, 8).replace(/:/g, "");

  canvas.toBlob(
    (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `og-image-${stamp}.jpg`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    "image/jpeg",
    0.92
  );
}

export default function Capture() {
  const frameRef = useRef(null);
  const [logoMode, setLogoMode] = useState("off");
  const [flash, setFlash] = useState(false);

  const save = () => {
    const frame = frameRef.current;
    const glCanvas = frame.querySelector(".three-background canvas");
    if (!glCanvas) return;

    // The canvas is not created with preserveDrawingBuffer, so its pixels are
    // only readable between drawing a frame and compositing it. r3f queued its
    // next frame before this click happened, so a callback queued now runs
    // straight after that frame is drawn, with the buffer still intact.
    requestAnimationFrame(async () => {
      const out = document.createElement("canvas");
      out.width = WIDTH;
      out.height = HEIGHT;
      const ctx = out.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(glCanvas, 0, 0, WIDTH, HEIGHT);

      // Serialised in the same frame as the scene, so an animating logo is
      // caught in the state it was in alongside it; only the decode waits.
      const svg = logoMode !== "off" && frame.querySelector(".logo svg");
      const markup = svg && serializeLogo(svg);

      if (markup) {
        const img = await loadImage(
          `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`
        );
        ctx.drawImage(img, (WIDTH - img.width) / 2, (HEIGHT - img.height) / 2);
      }

      download(out);
      setFlash(true);
      setTimeout(() => setFlash(false), 150);
    });
  };

  return (
    <main className="capture">
      <div
        className="capture-frame"
        ref={frameRef}
        style={{ width: WIDTH, height: HEIGHT }}
      >
        <HeroBackground />
        {logoMode !== "off" && (
          <div className={`capture-logo is-${logoMode}`}>
            <Logo />
          </div>
        )}
        <div className={`capture-flash${flash ? " is-on" : ""}`} />
      </div>

      <div className="capture-bar">
        <div className="capture-modes" role="group" aria-label="Logo">
          <span>Logo</span>
          {LOGO_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              aria-pressed={logoMode === mode.id}
              onClick={() => setLogoMode(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>
        <span className="capture-hint">Reload for a new scene</span>
        <button type="button" className="capture-save" onClick={save}>
          Save {WIDTH}×{HEIGHT} JPEG
        </button>
      </div>
    </main>
  );
}
