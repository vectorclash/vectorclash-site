import React from 'react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('./components/Header', () => ({ default: () => <div data-testid="header" /> }));
vi.mock('./components/About', () => ({ default: () => <div data-testid="about" /> }));
vi.mock('./components/LogoGrid', () => ({ default: () => <div data-testid="logo-grid" /> }));
vi.mock('./components/Projects', () => ({ default: () => <div data-testid="projects" /> }));
vi.mock('./components/ContactFooter', () => ({ default: () => <div data-testid="contact-footer" /> }));

import App from './App';

test('renders app sections', () => {
  const { getByTestId } = render(<App />);
  expect(getByTestId('header')).toBeInTheDocument();
  expect(getByTestId('about')).toBeInTheDocument();
  expect(getByTestId('logo-grid')).toBeInTheDocument();
  expect(getByTestId('projects')).toBeInTheDocument();
  expect(getByTestId('contact-footer')).toBeInTheDocument();
});
