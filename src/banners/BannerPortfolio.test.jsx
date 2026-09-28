import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

// WebGL, and components with their own tests of nothing here.
vi.mock('../components/HeroBackground', () => ({ default: () => <div data-testid="hero-background" /> }));
vi.mock('../components/ContactFooter', () => ({ default: () => <div data-testid="contact-footer" /> }));
vi.mock('../components/Logo', () => ({ default: () => <div /> }));
vi.mock('../components/HeadingIcon', () => ({ default: () => <span /> }));

import BannerPortfolio from './BannerPortfolio';
import clients from '../data/banners.json';

const banners = clients.flatMap((c) => c.banners);
const publicDir = resolve(import.meta.dirname, '../../public/banners');

// existsSync answers yes to the wrong case on a Mac, and the server is Linux,
// where it is a 404. So the path is walked a segment at a time and each name
// is matched exactly against the listing it sits in.
const existsExactly = (root, relative) => {
  let dir = root;
  return relative.split('/').every((name) => {
    let names;
    try {
      names = readdirSync(dir);
    } catch {
      return false;
    }
    dir = resolve(dir, name);
    return names.includes(name);
  });
};

test('every banner in the data has its creative and its poster on disk, in exact case', () => {
  const missing = banners.flatMap((b) => [
    `creatives/${b.path}/index.html`,
    `posters/${b.path}.webp`,
  ]).filter((file) => !existsExactly(publicDir, file));

  expect(missing).toEqual([]);
});

test('renders a section per client and a tile per banner', () => {
  render(<BannerPortfolio />);

  clients.forEach(({ client }) => {
    expect(screen.getByRole('region', { name: client })).toBeInTheDocument();
  });
  expect(screen.getAllByRole('button', { name: /\d+ by \d+$/ })).toHaveLength(banners.length);
});

test('a tile opens its creative live, and Escape closes it', () => {
  render(<BannerPortfolio />);
  const [first] = clients;
  const banner = first.banners[0];

  fireEvent.click(
    screen.getByRole('button', {
      name: `${first.client}: ${banner.title}, ${banner.width} by ${banner.height}`,
    })
  );

  const dialog = screen.getByRole('dialog');
  expect(dialog.querySelector('iframe')).toHaveAttribute(
    'src',
    `/banners/creatives/${banner.path}/index.html`
  );
  expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();

  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
