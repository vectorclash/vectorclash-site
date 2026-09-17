import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A list whose length follows a target, but which lets whatever is leaving
 * animate itself out first.
 *
 * Quality changes mid-session, which means star fields get removed while
 * someone is looking at them. Dropping them from the array simply unmounts
 * them, and a field of three hundred additive sprites vanishing between two
 * frames reads as a glitch -- exactly the thing that makes adaptive quality
 * feel broken rather than considerate. So nothing is ever removed on the way
 * down: the surplus is flagged `retiring`, the component fades itself, and it
 * calls release() when it is actually gone.
 *
 * Retirement is also reversible, which matters more than it sounds. The
 * governor can step back up a second later, and reviving a field that is
 * halfway through its fade costs nothing and looks like the scene breathing.
 * Rebuilding it would re-roll three hundred positions and re-upload the buffer,
 * so the field would come back somewhere else entirely.
 *
 * @param {number}   target      how many entries should be active
 * @param {function} createItem  builds the per-entry payload, called once each
 * @returns {[Array<{id: number, retiring: boolean, item: *}>, (id: number) => void]}
 */
export default function useRetiringCount(target, createItem) {
  // Held in a ref so callers can pass an inline lambda without the list
  // rebuilding itself on every render.
  const createRef = useRef(createItem);
  createRef.current = createItem;

  const nextId = useRef(0);
  const make = useCallback(
    () => ({ id: nextId.current++, retiring: false, item: createRef.current() }),
    []
  );

  const [entries, setEntries] = useState(() => Array.from({ length: target }, make));

  useEffect(() => {
    setEntries((prev) => {
      const active = prev.reduce((n, entry) => n + (entry.retiring ? 0 : 1), 0);
      if (active === target) return prev;

      const next = [...prev];

      if (active < target) {
        let needed = target - active;

        // Revive from the back: that is the most recently retired entry, so it
        // is the least far through its fade and comes back the most smoothly.
        for (let i = next.length - 1; i >= 0 && needed > 0; i--) {
          if (next[i].retiring) {
            next[i] = { ...next[i], retiring: false };
            needed--;
          }
        }

        while (needed > 0) {
          next.push(make());
          needed--;
        }

        return next;
      }

      let surplus = active - target;
      for (let i = next.length - 1; i >= 0 && surplus > 0; i--) {
        if (!next[i].retiring) {
          next[i] = { ...next[i], retiring: true };
          surplus--;
        }
      }

      return next;
    });
  }, [target, make]);

  // Guarded on `retiring`, because a fade that finishes just after the entry
  // was revived must not take the revived entry with it.
  const release = useCallback((id) => {
    setEntries((prev) => prev.filter((entry) => !(entry.id === id && entry.retiring)));
  }, []);

  return [entries, release];
}
