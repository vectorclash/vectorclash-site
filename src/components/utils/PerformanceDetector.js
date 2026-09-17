/**
 * Detects device performance capabilities
 * Returns a performance tier: 'low', 'medium', or 'high'
 */

let cachedTier = null;

export function detectPerformanceTier() {
  if (cachedTier) return cachedTier;

  let score = 0;

  // Check for mobile devices (typically lower performance)
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  // Check hardware concurrency (CPU cores)
  const cores = navigator.hardwareConcurrency || 2;
  if (cores >= 8) score += 3;
  else if (cores >= 4) score += 2;
  else score += 1;

  // Check device memory (if available)
  if (navigator.deviceMemory) {
    if (navigator.deviceMemory >= 8) score += 3;
    else if (navigator.deviceMemory >= 4) score += 2;
    else score += 1;
  } else {
    // Assume medium if not available
    score += 2;
  }

  // Check for GPU tier via WebGL
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

  if (gl) {
    const renderer = gl.getParameter(gl.RENDERER);
    if (renderer) {
      if (renderer.match(/Apple GPU|Apple M/i)) {
        score += 3;
      } else if (renderer.match(/Intel.*HD|Intel.*UHD/i)) {
        score += 1;
      } else if (renderer.match(/NVIDIA|AMD|Radeon/i)) {
        score += 3;
      } else {
        score += 2;
      }
    } else {
      score += 2;
    }
  } else {
    score += 1;
  }

  // Mobile devices get penalized
  if (isMobile) {
    score = Math.max(1, score - 2);
  }

  // Determine tier
  // Max score: 9, Min score: 3
  if (score >= 7) {
    cachedTier = 'high';
  } else if (score >= 5) {
    cachedTier = 'medium';
  } else {
    cachedTier = 'low';
  }

  return cachedTier;
}

export function getParticleConfig(tier = detectPerformanceTier()) {
  switch (tier) {
    case 'high':
      return {
        smallFields: 25,
        smallParticles: 300,
        largeFields: 12,
        largeParticles: 12,
      };
    case 'medium':
      return {
        smallFields: 15,
        smallParticles: 200,
        largeFields: 8,
        largeParticles: 10,
      };
    case 'low':
      return {
        smallFields: 8,
        smallParticles: 100,
        largeFields: 4,
        largeParticles: 6,
      };
    default:
      return {
        smallFields: 15,
        smallParticles: 200,
        largeFields: 8,
        largeParticles: 10,
      };
  }
}

// Bloom used to be cut below the medium tier, which in practice meant it was
// cut on every phone: Safari masks gl.RENDERER, so an iPhone scores as an
// unknown GPU and then takes the blanket mobile penalty on top, landing on
// 'low' however fast it actually is. The hero reads as a different animation
// with the pass off -- the stars and the cluster are lit for it -- so what was
// meant as a safety valve was really shipping two designs.
//
// It is also not the expensive thing here. mipmapBlur bloom is a fixed
// downsample chain plus one composite, a handful of fullscreen passes at
// steadily smaller sizes, and none of it scales with how much is in the scene;
// the canvas is already capped at dpr 1.5, which bounds all of it. The scene's
// real cost is the particle fields and the cluster's per-frame skin work, and
// those are tiered elsewhere.
//
// So the pass is on everywhere and the tier decides what it costs instead:
// below high, the chain is built from a half-size buffer. Against a blur that
// is on its way to being blurred anyway, that is most of the saving for none of
// the look.
export function getBloomResolutionScale(tier = detectPerformanceTier()) {
  return tier === 'high' ? 1 : 0.5;
}

export function shouldEnableAntialias(tier = detectPerformanceTier()) {
  return tier === 'high';
}

export function getGLPrecision(tier = detectPerformanceTier()) {
  return tier === 'high' ? 'highp' : 'mediump';
}
