// OKLab, shared by everything in the hero that has to reason about colour
// rather than merely carry it.
//
// The background field mixes in this space and the cluster's lights are keyed
// off what the field is showing, so both ends have to agree on the conversion
// exactly -- a second implementation that rounded differently would put the
// lights a little off the complement they were asked for, and nothing on
// screen would say why.

// Both transforms work in *linear* light, not sRGB. three's Color stores
// linear internally, so col.r/g/b feed straight in and setRGB(..., LinearSRGB)
// takes the result straight back.
export function linearToOklab(r, g, b) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}

// Writes into a caller-owned triple. The cluster's lights run this every
// frame, so the allocating form below is the convenience, not the primitive.
export function oklabToLinearInto(out, L, A, B) {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.2914855480 * B) ** 3;

  out[0] = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  out[1] = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  out[2] = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  return out;
}

export function oklabToLinear([L, A, B]) {
  return oklabToLinearInto([0, 0, 0], L, A, B);
}
