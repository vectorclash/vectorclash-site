import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// The module caches its level in a closure on first read, so every case needs a
// fresh copy of it. resetModules plus a dynamic import is the only way to get
// one.
async function estimate({ cores, memory, renderer }) {
  vi.resetModules();
  window.localStorage.clear();

  vi.spyOn(navigator, 'hardwareConcurrency', 'get').mockReturnValue(cores);
  Object.defineProperty(navigator, 'deviceMemory', {
    value: memory,
    configurable: true,
  });

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({
    getExtension: (name) =>
      name === 'WEBGL_debug_renderer_info'
        ? { UNMASKED_RENDERER_WEBGL: 0x9246 }
        : { loseContext: () => {} },
    getParameter: () => renderer,
  }));

  const mod = await import('./qualityLevel');
  return mod.estimateStartingLevel();
}

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('estimateStartingLevel', () => {
  // The bug this whole rewrite exists for: Safari reports no deviceMemory and
  // four cores whatever the phone, and gates the renderer string. Under the old
  // detector that added up to a guaranteed 'low' with no way out.
  test('a phone that discloses nothing starts in the middle, not at the floor', async () => {
    expect(await estimate({ cores: 4, memory: undefined, renderer: null })).toBe('medium');
  });

  test('a disclosed fast GPU on a phone-shaped CPU still reaches the middle', async () => {
    expect(await estimate({ cores: 4, memory: undefined, renderer: 'Apple GPU' })).toBe('medium');
  });

  test('high needs corroborating evidence, not one signal', async () => {
    expect(await estimate({ cores: 16, memory: 8, renderer: 'NVIDIA GeForce RTX 4070' })).toBe('high');
    expect(await estimate({ cores: 16, memory: undefined, renderer: null })).toBe('medium');
  });

  test('the floor needs evidence too', async () => {
    expect(await estimate({ cores: 2, memory: 2, renderer: 'Mali-T720' })).toBe('low');
    expect(await estimate({ cores: 4, memory: 2, renderer: null })).toBe('low');
  });

  // A fast CPU and 8GB of RAM would otherwise average a software renderer all
  // the way back up to 'medium'.
  test('software rendering overrides every other signal', async () => {
    expect(await estimate({ cores: 8, memory: 8, renderer: 'Google SwiftShader' })).toBe('low');
    expect(await estimate({ cores: 16, memory: 8, renderer: 'llvmpipe (LLVM 15.0.7)' })).toBe('low');
  });

  test('a stored level wins outright, so a return visit skips the guess', async () => {
    vi.resetModules();
    window.localStorage.setItem('vc:quality:v2', 'high');
    const mod = await import('./qualityLevel');
    expect(mod.estimateStartingLevel()).toBe('high');
  });

  test('a corrupt stored level falls back to measuring rather than throwing', async () => {
    vi.resetModules();
    window.localStorage.setItem('vc:quality:v2', 'ludicrous');
    vi.spyOn(navigator, 'hardwareConcurrency', 'get').mockReturnValue(4);
    const mod = await import('./qualityLevel');
    expect(['low', 'medium', 'high']).toContain(mod.estimateStartingLevel());
  });
});

describe('stepLevel', () => {
  let mod;

  beforeEach(async () => {
    vi.resetModules();
    window.localStorage.clear();
    window.localStorage.setItem('vc:quality:v2', 'medium');
    mod = await import('./qualityLevel');
  });

  test('clamps at both ends instead of running off the ladder', () => {
    expect(mod.stepLevel(1)).toBe('high');
    expect(mod.stepLevel(1)).toBe('high');
    expect(mod.stepLevel(-1)).toBe('medium');
    expect(mod.stepLevel(-1)).toBe('low');
    expect(mod.stepLevel(-1)).toBe('low');
  });

  test('notifies subscribers only on an actual change', () => {
    const listener = vi.fn();
    mod.subscribe(listener);

    mod.stepLevel(1);
    expect(listener).toHaveBeenCalledTimes(1);

    mod.stepLevel(1); // already at the top
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test('the latched level does not move with the adaptive one', () => {
    expect(mod.latchedLevel()).toBe('medium');
    mod.stepLevel(-1);
    expect(mod.getLevel()).toBe('low');
    expect(mod.latchedLevel()).toBe('medium');
  });

  test('the settled level is persisted for the next visit', () => {
    mod.stepLevel(1);
    expect(window.localStorage.getItem('vc:quality:v2')).toBe('high');
  });
});
