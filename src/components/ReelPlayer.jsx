import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap/all";
import HexagonLoader from "./HexagonLoader";
import closeIcon from "../images/window-close.svg";
import "./ReelPlayer.scss";

// How long the controls stay up after the last sign of anyone using them.
const IDLE_MS = 2500;
const SEEK_STEP = 5;

const clock = (seconds) => {
  const whole = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
};

export function PlayIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3.5v17a1 1 0 0 0 1.5.86l14-8.5a1 1 0 0 0 0-1.72l-14-8.5A1 1 0 0 0 6 3.5Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="3" width="5" height="18" rx="1" />
      <rect x="14" y="3" width="5" height="18" rx="1" />
    </svg>
  );
}

function SoundIcon({ muted }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 9.5v5a1 1 0 0 0 1 1h3.5l5 4.2a.9.9 0 0 0 1.5-.7V5a.9.9 0 0 0-1.5-.7l-5 4.2H4a1 1 0 0 0-1 1Z" />
      {muted ? (
        <path d="m17 9.5 5 5m0-5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M17 8.5a5 5 0 0 1 0 7m2.5-10a9 9 0 0 1 0 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}

function FullscreenIcon({ active }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={
          active
            ? "M9 3v6H3m12-6v6h6M9 21v-6H3m12 6v-6h6"
            : "M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6"
        }
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReelPlayer({ src, poster, title, onClose }) {
  const rootRef = useRef(null);
  const frameRef = useRef(null);
  const videoRef = useRef(null);
  const scrubRef = useRef(null);
  const scrubbingRef = useRef(false);
  const closingRef = useRef(false);
  const idleTimerRef = useRef(null);
  const pointerTypeRef = useRef("mouse");

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [awake, setAwake] = useState(true);
  const [duration, setDuration] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  // Paused, the controls are the only thing on screen worth looking at, so
  // they only ever hide over a picture that is actually moving.
  const chromeVisible = awake || !playing;

  const wake = () => {
    setAwake(true);
    window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = window.setTimeout(() => setAwake(false), IDLE_MS);
  };

  const close = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (document.fullscreenElement) document.exitFullscreen?.();
    gsap.killTweensOf([rootRef.current, frameRef.current]);
    // The sound leaves with the picture instead of being cut under it.
    gsap.to(videoRef.current, { volume: 0, duration: 0.2, ease: "none" });
    gsap.to(rootRef.current, {
      opacity: 0,
      duration: 0.22,
      ease: "power1.in",
      onComplete: onClose,
    });
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  const toggleMute = () => {
    videoRef.current.muted = !videoRef.current.muted;
  };

  // An iPhone has no element fullscreen, only the video's own native player.
  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (document.fullscreenElement) document.exitFullscreen();
    else if (rootRef.current.requestFullscreen) rootRef.current.requestFullscreen();
    else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
  };

  const seekBy = (delta) => {
    const video = videoRef.current;
    video.currentTime = Math.min(video.duration || 0, Math.max(0, video.currentTime + delta));
  };

  const paintScrub = (time, total) => {
    const scrub = scrubRef.current;
    if (!scrub) return;
    scrub.value = time;
    scrub.style.setProperty("--progress", `${total ? (time / total) * 100 : 0}%`);
  };

  // Entrance, and the whole-life setup: a tap on the button is what allows sound,
  // so the reel starts straight away, and if the browser refuses anyway the
  // reader is left on a paused frame with a play button instead of an error.
  useEffect(() => {
    const previousFocus = document.activeElement;
    const video = videoRef.current;

    rootRef.current.focus({ preventScroll: true });
    gsap.fromTo(rootRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.out" });
    gsap.fromTo(frameRef.current, { scale: 0.97 }, { scale: 1, duration: 0.5, ease: "power2.out", clearProps: "transform" });

    video.play().catch(() => setLoading(false));
    wake();

    return () => {
      window.clearTimeout(idleTimerRef.current);
      gsap.killTweensOf([rootRef.current, frameRef.current, video]);
      // Taking the source away is what stops the download. A paused element
      // that has been removed can keep fetching it.
      video.pause();
      video.removeAttribute("src");
      video.load();
      previousFocus?.focus?.({ preventScroll: true });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The scrubber is written on every frame without going through React: at
  // timeupdate's four times a second it visibly steps, and re-rendering the
  // player sixty times a second would buy nothing. The clock only changes once
  // a second, so that part does go through state.
  useEffect(() => {
    let frame;
    const tick = () => {
      const video = videoRef.current;
      if (video && !scrubbingRef.current) {
        paintScrub(video.currentTime, video.duration);
        setSeconds(Math.floor(video.currentTime));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      const target = e.target;
      const onButton = target instanceof Element && target.closest("button");
      const onScrub = target === scrubRef.current;

      switch (e.key) {
        case "Escape":
          // Leaving fullscreen is the browser's, and takes this key first.
          if (!document.fullscreenElement) close();
          break;
        case " ":
        case "k":
          // A focused button is already answering Space with its own click.
          if (e.key === " " && onButton) return;
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
        case "ArrowRight":
          if (onScrub) break;
          e.preventDefault();
          seekBy(e.key === "ArrowLeft" ? -SEEK_STEP : SEEK_STEP);
          break;
        case "m":
          toggleMute();
          break;
        case "f":
          toggleFullscreen();
          break;
        case "Tab": {
          // The page behind is still in the document, so focus is held in here.
          const focusable = rootRef.current.querySelectorAll("button, input");
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && (target === first || target === rootRef.current)) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && target === last) {
            e.preventDefault();
            first.focus();
          }
          break;
        }
        default:
          return;
      }
      wake();
    };

    const onFullscreenChange = () => setFullscreen(Boolean(document.fullscreenElement));

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The page does not scroll behind the reel. Stopped here rather than with
  // overflow: hidden on the document, because removing the scrollbar changes the
  // page's width, which refits the hero and re-measures every ScrollTrigger on
  // the way in and again on the way out.
  useEffect(() => {
    const root = rootRef.current;
    const stop = (e) => {
      if (e.target !== scrubRef.current) e.preventDefault();
    };
    root.addEventListener("wheel", stop, { passive: false });
    root.addEventListener("touchmove", stop, { passive: false });
    return () => {
      root.removeEventListener("wheel", stop);
      root.removeEventListener("touchmove", stop);
    };
  }, []);

  const onStageClick = () => {
    // On touch the first tap on a bare picture only brings the controls back,
    // as there is no hover to have done it already.
    if (pointerTypeRef.current === "touch" && !chromeVisible) {
      wake();
      return;
    }
    togglePlay();
    wake();
  };

  return createPortal(
    <div
      className={`reel-player${chromeVisible ? "" : " is-idle"}`}
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabIndex={-1}
      onPointerMove={(e) => {
        if (e.pointerType === "mouse") wake();
      }}
    >
      <div
        className="reel-player-stage"
        ref={frameRef}
        onPointerDown={(e) => {
          pointerTypeRef.current = e.pointerType;
        }}
        onClick={onStageClick}
      >
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          preload="auto"
          playsInline
          aria-label={title}
          onPlay={() => setPlaying(true)}
          onPlaying={() => setLoading(false)}
          onPause={() => setPlaying(false)}
          onWaiting={() => setLoading(true)}
          onCanPlay={() => setLoading(false)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
          onError={() => {
            setFailed(true);
            setLoading(false);
          }}
        />
      </div>

      {loading && !failed && (
        <div className="reel-player-loader">
          <HexagonLoader />
        </div>
      )}

      {failed && (
        <p className="reel-player-message" role="alert">
          The reel couldn&rsquo;t be loaded. Please try again in a moment.
        </p>
      )}

      {!playing && !loading && !failed && (
        <div className="reel-player-paused" aria-hidden="true">
          <PlayIcon />
        </div>
      )}

      <button
        type="button"
        className="reel-player-close"
        onClick={close}
        aria-label="Close reel"
        title="Close"
      >
        <img src={closeIcon} alt="" />
      </button>

      <div className="reel-player-controls" onFocus={wake}>
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          title={playing ? "Pause" : "Play"}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>

        <input
          ref={scrubRef}
          className="reel-player-scrub"
          type="range"
          min="0"
          max={duration || 0}
          step="0.01"
          defaultValue="0"
          aria-label="Seek"
          aria-valuetext={`${clock(seconds)} of ${clock(duration)}`}
          onPointerDown={() => {
            scrubbingRef.current = true;
          }}
          onPointerUp={() => {
            scrubbingRef.current = false;
          }}
          onInput={(e) => {
            const time = Number(e.currentTarget.value);
            videoRef.current.currentTime = time;
            paintScrub(time, duration);
            setSeconds(Math.floor(time));
            wake();
          }}
        />

        <span className="reel-player-time">
          {clock(seconds)} / {clock(duration)}
        </span>

        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
          title={muted ? "Unmute" : "Mute"}
        >
          <SoundIcon muted={muted} />
        </button>

        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          <FullscreenIcon active={fullscreen} />
        </button>
      </div>
    </div>,
    document.body
  );
}

export default ReelPlayer;
