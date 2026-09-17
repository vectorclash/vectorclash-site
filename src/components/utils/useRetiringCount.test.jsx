import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import useRetiringCount from './useRetiringCount';

const active = (entries) => entries.filter((entry) => !entry.retiring);
const retiring = (entries) => entries.filter((entry) => entry.retiring);

function setup(initial) {
  let made = 0;
  const hook = renderHook(({ target }) => useRetiringCount(target, () => ({ n: made++ })), {
    initialProps: { target: initial },
  });
  return hook;
}

describe('useRetiringCount', () => {
  test('starts at the target with distinct ids', () => {
    const { result } = setup(3);
    const [entries] = result.current;

    expect(entries).toHaveLength(3);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(3);
    expect(entries.every((entry) => !entry.retiring)).toBe(true);
  });

  test('flags the surplus instead of dropping it', () => {
    const { result, rerender } = setup(4);
    const before = result.current[0].map((entry) => entry.id);

    act(() => rerender({ target: 2 }));
    const [entries] = result.current;

    // Nothing has left yet -- that is the whole point. The components are still
    // mounted and still drawing while they fade.
    expect(entries).toHaveLength(4);
    expect(active(entries)).toHaveLength(2);
    expect(entries.map((entry) => entry.id)).toEqual(before);
  });

  test('release removes only what has finished fading', () => {
    const { result, rerender } = setup(3);
    act(() => rerender({ target: 1 }));

    const doomed = retiring(result.current[0]).map((entry) => entry.id);
    act(() => result.current[1](doomed[0]));

    expect(result.current[0]).toHaveLength(2);
    expect(result.current[0].map((entry) => entry.id)).not.toContain(doomed[0]);
  });

  // The race the guard in release() exists for: the governor steps back up
  // while a field is mid-fade, so the field is revived, and then its original
  // fade-out tween completes and calls onRetired for an entry that is now
  // wanted again.
  test('a release that lands after a revival is ignored', () => {
    const { result, rerender } = setup(3);

    act(() => rerender({ target: 1 }));
    const doomed = retiring(result.current[0])[0].id;

    act(() => rerender({ target: 3 }));
    expect(active(result.current[0])).toHaveLength(3);

    act(() => result.current[1](doomed));

    expect(result.current[0]).toHaveLength(3);
    expect(result.current[0].map((entry) => entry.id)).toContain(doomed);
  });

  test('revives before creating, so fields keep their positions', () => {
    const { result, rerender } = setup(4);
    const original = result.current[0].map((entry) => entry.item.n);

    act(() => rerender({ target: 1 }));
    act(() => rerender({ target: 4 }));

    const [entries] = result.current;
    expect(entries).toHaveLength(4);
    expect(active(entries)).toHaveLength(4);
    // No new payloads were built: every field came back as the one it was.
    expect(entries.map((entry) => entry.item.n)).toEqual(original);
  });

  test('creates new entries once the retired ones are used up', () => {
    const { result, rerender } = setup(2);

    act(() => rerender({ target: 5 }));
    const [entries] = result.current;

    expect(active(entries)).toHaveLength(5);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(5);
  });

  test('going to zero retires everything and keeps it mounted', () => {
    const { result, rerender } = setup(3);

    act(() => rerender({ target: 0 }));

    expect(active(result.current[0])).toHaveLength(0);
    expect(result.current[0]).toHaveLength(3);
  });

  test('a target it is already at does not churn the array', () => {
    const { result, rerender } = setup(3);
    const before = result.current[0];

    act(() => rerender({ target: 3 }));

    expect(result.current[0]).toBe(before);
  });
});
