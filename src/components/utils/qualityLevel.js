/**
 * The site's quality level: one number, shared by both scenes, measured rather
 * than guessed.
 *
 * The previous detector scored hardwareConcurrency, deviceMemory and a regex on
 * gl.RENDERER, then took two points off anything with a mobile user agent. Three
 * things were wrong with that, and they compounded:
 *
 *   - gl.RENDERER is the *masked* string ("WebKit WebGL"). The unmasked value
 *     needs the WEBGL_debug_renderer_info extension, which the old code never
 *     asked for, so every device on earth fell through to the unknown-GPU
 *     branch. The Apple and NVIDIA arms were dead code.
 *   - Safari reports no deviceMemory and four cores whatever the phone. Chrome
 *     on Android reports eight of each. So a mid-range Android outscored every
 *     iPhone ever made -- the score measured how much a browser was willing to
 *     disclose, not how fast the device was.
 *   - On top of that the mobile penalty. An iPhone landed on exactly 4 of 9,
 *     deterministically, with no input able to move it, which pinned the floor
 *     on every knob: 2 noise octaves, cluster detail 16, a third of the stars.
 *
 * So the static read is now only a *starting* guess, and it is deliberately
 * shy: it awards points for positive evidence, takes them away only for
 * positive evidence of weakness, and treats a missing signal as no evidence
 * either way. Nothing is penalised for being a phone. From there the real
 * measurement takes over -- see QualityGovernor, which watches the frame rate
 * and walks this level up or down.
 *
 * Settings split into two kinds, and the split is the whole design:
 *
 *   ADAPTIVE   dpr, bloom resolution, star field counts, film grain. These can
 *              change mid-session, so the governor drives them. Anything that
 *              *disappears* is faded out first -- see useRetiringCount.
 *   LATCHED    multisampling, cluster detail, gradient octaves. Changing these
 *              recompiles a shader, rebuilds geometry or disposes the whole
 *              EffectComposer, all of which drop frames. They are read once,
 *              from the starting level, and never again in that session.
 *
 * The settled level is written to localStorage, so the latched settings on a
 * return visit start from what the device actually proved it could do rather
 * than from the shy guess again.
 */

export const LEVELS = ['low', 'medium', 'high'];

const STORE_KEY = 'vc:quality:v2';

// Everything either scene reads. Keys the governor may change are marked
// ADAPTIVE above; the rest are only ever read through latchedLevel().
const SETTINGS = {
  low: {
    smallFields: 10,
    smallParticles: 140,
    largeFields: 5,
    largeParticles: 8,
    bloomScale: 0.4,
    // Resolution is the last knob turned, not the first. Every device used to
    // render at 1.5 and nobody complained about the frame rate there, so the
    // ladder keeps 1.5 for two of its three rungs and only gives ground at the
    // bottom -- counts, bloom and grain are cut long before pixels are, because
    // a phone that has dropped a few hundred stars still looks like the scene
    // and a phone rendering at 1.0 looks broken.
    dpr: 1.25,
    grain: 0,
    multisampling: 0,
    clusterDetail: 'low',
    octaves: 2,
  },
  medium: {
    smallFields: 18,
    smallParticles: 220,
    largeFields: 9,
    largeParticles: 10,
    bloomScale: 0.6,
    dpr: 1.5,
    grain: 0.05,
    multisampling: 0,
    clusterDetail: 'medium',
    octaves: 4,
  },
  high: {
    smallFields: 25,
    smallParticles: 300,
    largeFields: 12,
    largeParticles: 12,
    bloomScale: 1,
    dpr: 1.5,
    grain: 0.05,
    // 8x MSAA on a full-size half-float target was the composer's default and
    // nothing ever overrode it, on any device, at any tier -- comfortably more
    // expensive than the bloom chain the old comment here agonised over. Two
    // samples is plenty against geometry this soft.
    multisampling: 2,
    clusterDetail: 'high',
    octaves: 4,
  },
};

function readStored() {
  try {
    const stored = window.localStorage.getItem(STORE_KEY);
    return LEVELS.includes(stored) ? stored : null;
  } catch {
    // Safari in private mode throws on localStorage rather than returning null.
    return null;
  }
}

function writeStored(level) {
  try {
    window.localStorage.setItem(STORE_KEY, level);
  } catch {
    /* Nothing to do; the guess simply costs a few seconds again next visit. */
  }
}

// The unmasked renderer string, or null. Worth asking for properly: where it is
// available it is the only signal here that describes the GPU rather than the
// machine around it. Where it is not -- Safari 16+, Firefox with RFP on, and
// increasingly Chrome -- we get null and score nothing, which is the point.
function rendererString() {
  const canvas = document.createElement('canvas');
  const gl =
    canvas.getContext('webgl2') ||
    canvas.getContext('webgl') ||
    canvas.getContext('experimental-webgl');

  if (!gl) return null;

  let name = null;
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) name = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
  } catch {
    name = null;
  }

  // The old detector opened a context here and held it for the life of the
  // page. Browsers cap the number of live WebGL contexts at around eight, and
  // this one is wanted for a single string.
  gl.getExtension('WEBGL_lose_context')?.loseContext();

  return typeof name === 'string' ? name : null;
}

const FAST_GPU = /Apple (GPU|M\d)|NVIDIA|GeForce|RTX|Radeon|AMD|Adreno \(TM\) [78]\d\d|Mali-G[789]\d/i;
const SLOW_GPU = /Intel.*(HD|UHD) Graphics|Adreno \(TM\) [345]\d\d|Mali-(4|T)\d\d/i;

// No CPU or amount of RAM redeems these: the GPU is the CPU. Scoring them would
// let a fast machine with a broken driver average its way back up to 'medium'
// and spend three seconds proving otherwise.
const SOFTWARE_GPU = /SwiftShader|llvmpipe|Software|Microsoft Basic Render/i;

/**
 * The shy guess. Returns a level, never throws, and is only ever the starting
 * position -- QualityGovernor has the last word.
 */
export function estimateStartingLevel() {
  const stored = readStored();
  if (stored) return stored;

  const renderer = rendererString();
  if (renderer && SOFTWARE_GPU.test(renderer)) return 'low';

  let score = 0;

  // Present on every browser, but it describes the CPU and is clamped for
  // privacy on Safari, so it is weighted lightly and never negative above four.
  const cores = navigator.hardwareConcurrency;
  if (cores >= 8) score += 2;
  else if (cores >= 6) score += 1;
  else if (cores && cores < 4) score -= 1;

  // Absent on Safari and on Firefox. Absent is not evidence of anything.
  const memory = navigator.deviceMemory;
  if (memory >= 8) score += 2;
  else if (memory >= 4) score += 1;
  else if (memory && memory < 4) score -= 2;

  if (renderer && FAST_GPU.test(renderer)) score += 2;
  else if (renderer && SLOW_GPU.test(renderer)) score -= 2;

  // Note the asymmetry: 'high' needs real corroborating evidence, but the floor
  // needs evidence too. A device that tells us nothing starts in the middle and
  // climbs within a couple of seconds if it deserves to.
  if (score >= 3) return 'high';
  if (score <= -2) return 'low';
  return 'medium';
}

let current = null;
let latched = null;
const listeners = new Set();

function ensureInitialised() {
  if (current === null) {
    current = estimateStartingLevel();
    latched = current;
  }
}

/**
 * The level the structural settings were fixed to at startup. Read this for
 * anything whose change would rebuild geometry or recompile a shader.
 */
export function latchedLevel() {
  ensureInitialised();
  return latched;
}

/** Settings for the latched level -- multisampling, cluster detail, octaves. */
export function latchedSettings() {
  return SETTINGS[latchedLevel()];
}

export function getLevel() {
  ensureInitialised();
  return current;
}

export function getSettings(level = getLevel()) {
  return SETTINGS[level] || SETTINGS.medium;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setLevel(next) {
  if (next === current) return;
  current = next;
  writeStored(next);
  listeners.forEach((listener) => listener());
}

/**
 * Move one step along the ladder. The governor calls this; nothing else should.
 * Steps are single because each one is visible, and a fade looks like a
 * decision when it happens alone and like a fault when three land together.
 */
export function stepLevel(direction) {
  ensureInitialised();
  const index = LEVELS.indexOf(current);
  const next = LEVELS[Math.min(LEVELS.length - 1, Math.max(0, index + direction))];
  setLevel(next);
  return next;
}
