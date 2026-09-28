import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import close from "../images/window-close.svg";

// The room the chrome takes outside the banner: the close button above it and
// the caption below, and a margin at the sides. Kept in step with the
// matching custom properties in BannerPortfolio.scss.
const GUTTER_X = 24;
const GUTTER_Y = 72;

// A banner plays at its actual size wherever it fits. Where it does not -- a
// 728x90 leaderboard on a phone -- the whole unit is scaled down to the
// screen, rather than cropped by the edge of it the way the old preview was.
function fitScale(width, height) {
  return Math.min(
    1,
    (window.innerWidth - GUTTER_X * 2) / width,
    (window.innerHeight - GUTTER_Y * 2) / height
  );
}

/**
 * The live preview. The same arrangement the banner portfolio always had --
 * the creative in an iframe, centred over a dark veil, and a click anywhere
 * outside it to close -- with the site's own close control and caption.
 *
 * A click inside the banner is the banner's: iframe events do not reach this
 * document, so it opens the creative's clickthrough rather than closing.
 */
export default function BannerPreview({ banner, client, src, glow, onClose }) {
  const { width, height, title } = banner;
  const [scale, setScale] = useState(() => fitScale(width, height));
  const closeRef = useRef(null);

  // Held in a ref so the effect below runs once per preview. The page hands
  // down a fresh arrow every render, and re-running it would take the focused
  // close button for the opener and hand focus back to the wrong place.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useLayoutEffect(() => {
    const onResize = () => setScale(fitScale(width, height));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [width, height]);

  // Focus goes to the close button on the way in and back to the tile that
  // opened the preview on the way out, so a keyboard is left where it was.
  useEffect(() => {
    const opener = document.activeElement;
    closeRef.current?.focus({ preventScroll: true });

    const onKeyDown = (e) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (opener instanceof HTMLElement) opener.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <div
      className="banner-preview"
      role="dialog"
      aria-modal="true"
      aria-label={`${client}: ${title}`}
      onClick={onClose}
      style={{ "--preview-glow": glow }}
    >
      <div
        className="banner-preview-stage"
        style={{ width: width * scale, height: height * scale }}
      >
        <div
          className="banner-preview-frame"
          style={{ width, height, transform: `scale(${scale})` }}
        >
          <iframe
            src={src}
            title={`${client}: ${title}`}
            width={width}
            height={height}
            scrolling="no"
          />
        </div>
        <button
          type="button"
          className="banner-preview-close"
          onClick={onClose}
          aria-label="Close"
          ref={closeRef}
        >
          <img src={close} alt="" />
        </button>
        <div className="banner-preview-caption">
          <span>{client}</span> {title}
          <span className="banner-preview-size">
            {width}&times;{height}
            {scale < 1 && ` at ${Math.round(scale * 100)}%`}
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
