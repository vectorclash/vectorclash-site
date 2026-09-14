import tinycolor from "tinycolor2";

// How often a varied palette keeps the flat, fully saturated look the site
// started with. The rest of the time it takes a wide lightness arc, which is
// where the darker states come from. One number to retune the mix.
const VIVID_CHANCE = 0.35;

const BASE_HUE = tinycolor("#CCFF00").toHsl().h;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default class GradientGenerator {
  /**
   * @param {number} colorNum   how many stops to produce
   * @param {boolean} random    spin each stop independently instead of stepping
   * @param {boolean} varied    let lightness and saturation range, rather than
   *                            pinning every stop to 100% / 50%
   */
  constructor(colorNum, random = false, varied = false) {
    let colorRotation = this.randomColorRotation();
    let colorSize = 30 + Math.random() * 80;

    let baseHue = BASE_HUE + this.randomColorRotation();

    // A palette either keeps the flat look or takes the wide arc -- rolled once
    // per palette, so each one has a consistent character rather than mixing
    // flat and shaded stops in the same ramp.
    this.vivid = !varied || Math.random() < VIVID_CHANCE;

    // One lightness wave per palette: a level to sit around, how far it
    // travels, and where in the wave the first stop lands. Sampling a sine
    // rather than a straight ramp lets a palette fall dark through the middle
    // and come back up, instead of only ever climbing from one end to the other.
    const anchor = 0.20 + Math.random() * 0.30;
    const spread = 0.20 + Math.random() * 0.26;
    const phase = Math.random() * Math.PI * 2;
    const arc = (0.6 + Math.random() * 1.7) * Math.PI;

    this.colors = [];
    for (let i = 0; i < colorNum; i++) {
      const hue = random
        ? baseHue + this.randomColorRotation()
        : baseHue + colorRotation + colorSize * i;

      this.colors.push(
        tinycolor({ h: ((hue % 360) + 360) % 360, ...this.tone(i, colorNum, { anchor, spread, phase, arc }) })
      );
    }

    return this;
  }

  tone(i, colorNum, wave) {
    if (this.vivid) return { s: 1, l: 0.5 };

    const t = colorNum === 1 ? 0 : i / (colorNum - 1);
    const l = clamp(wave.anchor + wave.spread * Math.sin(wave.phase + t * wave.arc), 0.05, 0.82);

    // Pale stops turn neon if they hold full saturation, so let saturation fall
    // away as lightness climbs.
    const s = clamp(1 - (l - 0.45) * 0.95, 0.45, 1);

    return { s, l };
  }

  randomColorRotation() {
    return Math.round(Math.random() * 360);
  }
}
