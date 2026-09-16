import tinycolor from "tinycolor2";

// How often a varied palette keeps the flat, fully saturated look the site
// started with. The rest of the time it takes a lightness arc, which is where
// the shaded states come from. One number to retune the mix.
const VIVID_CHANCE = 0.35;

const BASE_HUE = tinycolor("#CCFF00").toHsl().h;

// How far around the wheel one palette may travel, first stop to last. Stepping
// a fixed 30-110 degrees per stop let a five-stop ramp cover 440 degrees --
// further than the whole wheel -- so which hues ended up meeting each other was
// luck. A palette now picks a relationship first and divides it across however
// many stops it has, which keeps the variety and drops the accidents.
const HUE_SPANS = [
  [22, 60], // analogous -- neighbours on the wheel
  [75, 145], // related -- about a quarter turn
  [165, 195], // complementary -- the two ends oppose
  [300, 355], // wheel -- the long way round, ends nearly meeting
];

// How far the hue may jump between two neighbouring stops. A span is shared out
// across the stops, so the wide relationships only stay cohesive when there are
// enough stops to take them in small steps: the long way round the wheel reads
// as a sweep over five stops and as a clash over three. Spans that cannot fit
// are not offered, and the ones that just fit are trimmed to it.
const MAX_STEP = 78;

// The overall level a palette sits at, rolled once per palette and weighted
// towards the dark end. Every palette used to key off the same mid lightness,
// so each one was fine on its own and the header never stopped shouting. The
// weights are shares of one roll, not probabilities.
// Once in a while the header should be allowed to shout. A flare ignores the
// keys and the step cap both: it takes one of the two widest hue relationships,
// opens the step up far enough to actually travel them, holds full saturation
// and sits at a bright level. Rare enough that it reads as an event rather than
// as the palette being inconsistent -- turn it up here and nowhere else.
const FLARE_CHANCE = 0.07;
const FLARE_STEP = 132;
const FLARE_LEVEL = [0.44, 0.58];

const TONAL_KEYS = [
  { weight: 4, level: [0.12, 0.24] }, // deep -- the field reads as dark, colour in it
  { weight: 4, level: [0.24, 0.39] }, // low -- shadowed colour, still plainly colour
  { weight: 2, level: [0.39, 0.52] }, // open -- as bright as the header now goes
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default class GradientGenerator {
  /**
   * @param {number} colorNum   how many stops to produce
   * @param {boolean} random    spin each stop independently instead of stepping
   * @param {boolean} varied    let lightness and saturation range, rather than
   *                            pinning every stop to 100% / 50%
   */
  constructor(colorNum, random = false, varied = false) {
    let baseHue = BASE_HUE + this.randomColorRotation();

    this.flare = varied && Math.random() < FLARE_CHANCE;

    // Two stops are a single blend rather than a walk, so any relationship is
    // open to them -- opposites included, which OKLab carries cleanly.
    const steps = Math.max(1, colorNum - 1);
    const maxStep = this.flare ? FLARE_STEP : MAX_STEP;

    // A flare only draws from the two widest relationships, so it is always
    // carrying hues from right across the wheel rather than a wide-ish sweep.
    const offered = this.flare ? HUE_SPANS.slice(-2) : HUE_SPANS;
    const spans =
      colorNum <= 2 ? offered : offered.filter(([low]) => low / steps <= maxStep);

    const [spanMin, spanMax] = (spans.length ? spans : offered)[
      Math.floor(Math.random() * (spans.length ? spans.length : offered.length))
    ];
    const ceiling = colorNum <= 2 ? spanMax : Math.min(spanMax, maxStep * steps);
    const span = (spanMin + Math.random() * (ceiling - spanMin)) * (Math.random() < 0.5 ? -1 : 1);
    const step = colorNum > 1 ? span / (colorNum - 1) : 0;

    // A palette either keeps the flat look or takes the arc -- rolled once
    // per palette, so each one has a consistent character rather than mixing
    // flat and shaded stops in the same ramp. A flare is always flat: every
    // stop at full strength is what makes it the loud one.
    this.vivid = this.flare || !varied || Math.random() < VIVID_CHANCE;

    // One lightness wave per palette: the key it sits at, how far it travels
    // either side, and where in the wave the first stop lands. Sampling a sine
    // rather than a straight ramp lets a palette fall dark through the middle
    // and come back up, instead of only ever climbing from one end to the other.
    // Only the header asks to vary; everything else keeps the old mid level.
    const level = this.flare
      ? FLARE_LEVEL[0] + Math.random() * (FLARE_LEVEL[1] - FLARE_LEVEL[0])
      : varied
        ? this.rollKey()
        : 0.5;

    // Scaled to the key, so a deep palette keeps an arc worth seeing instead of
    // swinging half of its stops into the floor and flattening against it.
    const spread = (0.06 + level * 0.28) * (0.7 + Math.random() * 0.6);
    const phase = Math.random() * Math.PI * 2;
    const arc = (0.6 + Math.random() * 1.7) * Math.PI;

    this.colors = [];
    for (let i = 0; i < colorNum; i++) {
      const hue = random ? baseHue + this.randomColorRotation() : baseHue + step * i;

      this.colors.push(
        tinycolor({ h: ((hue % 360) + 360) % 360, ...this.tone(i, colorNum, { level, spread, phase, arc }) })
      );
    }

    return this;
  }

  // Weighted pick of a key, then a level from inside it.
  rollKey() {
    let roll = Math.random() * TONAL_KEYS.reduce((sum, key) => sum + key.weight, 0);

    const key = TONAL_KEYS.find((candidate) => (roll -= candidate.weight) <= 0) ?? TONAL_KEYS[0];
    const [low, high] = key.level;

    return low + Math.random() * (high - low);
  }

  tone(i, colorNum, wave) {
    // A flat palette is still flat across its stops -- that is the character.
    // It just no longer means the same mid lightness every time; it takes the
    // palette's key the way a shaded one does.
    if (this.vivid) return { s: 1, l: wave.level };

    const t = colorNum === 1 ? 0 : i / (colorNum - 1);
    const l = clamp(wave.level + wave.spread * Math.sin(wave.phase + t * wave.arc), 0.06, 0.66);

    // Only the genuinely pale end needs holding back -- it turns neon carrying
    // full saturation. Everything below it keeps its chroma, so a shaded stop
    // reads as shaded rather than as chalk.
    const s = clamp(1 - Math.max(0, l - 0.58) * 1.15, 0.62, 1);

    return { s, l };
  }

  randomColorRotation() {
    return Math.round(Math.random() * 360);
  }
}
