import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

// WebGL, the logo's own animation and the loader's.
vi.mock('./HeroBackground', () => ({ default: ({ paused }) => <div data-testid="hero-background" data-paused={String(paused)} /> }));
vi.mock('./Logo', () => ({ default: () => <div /> }));
vi.mock('./HexagonLoader', () => ({ default: () => <div /> }));

import Hero from './Hero';
import profile from '../data/profile.json';

beforeEach(() => {
  // jsdom has no media loading of its own.
  window.HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
  window.HTMLMediaElement.prototype.pause = vi.fn();
  window.HTMLMediaElement.prototype.load = vi.fn();
});

const openReel = () => {
  render(<Hero />);
  fireEvent.click(screen.getByRole('button', { name: profile.reel.text }));
  return screen.getByRole('dialog', { name: profile.reel.title });
};

test('the hero button opens the reel over the page, playing, with the scene parked', () => {
  const dialog = openReel();
  const video = dialog.querySelector('video');
  expect(video.getAttribute('src')).toBe(profile.reel.video);
  expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
  expect(screen.getByTestId('hero-background').dataset.paused).toBe('true');
});

test('Escape and the close button both leave, and the scene runs again', async () => {
  for (const leave of [
    () => fireEvent.keyDown(document, { key: 'Escape' }),
    () => fireEvent.click(screen.getByRole('button', { name: 'Close reel' })),
  ]) {


    openReel();
    leave();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getAllByTestId('hero-background').at(-1).dataset.paused).toBe('false');
    document.body.innerHTML = '';
  }
});

test('Space on the page toggles playback, and not on a focused button', () => {
  const dialog = openReel();
  const play = window.HTMLMediaElement.prototype.play;
  play.mockClear();
  const video = dialog.querySelector('video');
  Object.defineProperty(video, 'paused', { configurable: true, value: true });

  fireEvent.keyDown(dialog, { key: ' ' });
  expect(play).toHaveBeenCalledTimes(1);

  fireEvent.keyDown(screen.getByRole('button', { name: 'Mute' }), { key: ' ' });
  expect(play).toHaveBeenCalledTimes(1);
});
