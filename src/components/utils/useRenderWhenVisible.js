import { useCallback, useEffect, useState } from "react";

/**
 * Gives react-three-fiber a frameloop value driven by whether a canvas is
 * actually worth drawing: on screen, in a foreground tab, and switched on by
 * the caller. A canvas left on "always" keeps rendering every frame forever --
 * scrolled past, faded to zero opacity, or in a background tab -- which is pure
 * heat for no pixels anyone sees.
 *
 * Returns [ref, frameloop]. Attach the ref to the <Canvas>, pass the frameloop
 * straight through, and keep in mind that r3f resets clock.elapsedTime to 0
 * every time that value changes: anything that needs a continuous time base has
 * to accumulate useFrame's delta itself.
 *
 * @param {boolean} enabled  caller-side gate, for a canvas that is mounted but
 *                           deliberately not being shown
 */
export default function useRenderWhenVisible(enabled = true) {
  const [node, setNode] = useState(null);
  const [onScreen, setOnScreen] = useState(true);
  const [tabVisible, setTabVisible] = useState(
    () => typeof document === "undefined" || document.visibilityState !== "hidden"
  );

  // A callback ref rather than a useRef, so the observer attaches whenever the
  // canvas element actually arrives instead of racing the mount effect.
  const ref = useCallback((element) => setNode(element ?? null), []);

  useEffect(() => {
    if (!node || typeof IntersectionObserver === "undefined") return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting),
      // Any sliver on screen counts, and a little margin means the canvas is
      // already running by the time it scrolls properly into view.
      { threshold: 0, rootMargin: "200px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  useEffect(() => {
    const onChange = () => setTabVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  return [ref, enabled && onScreen && tabVisible ? "always" : "never"];
}
