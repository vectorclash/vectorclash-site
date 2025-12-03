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
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      // Check for integrated vs dedicated GPU
      if (renderer.match(/Apple GPU|Apple M/i)) {
        score += 3; // Apple Silicon is high performance
      } else if (renderer.match(/Intel.*HD|Intel.*UHD/i)) {
        score += 1; // Intel integrated graphics
      } else if (renderer.match(/NVIDIA|AMD|Radeon/i)) {
        score += 3; // Dedicated GPU
      } else {
        score += 2; // Unknown, assume medium
      }
    } else {
      score += 2;
    }
  } else {
    score += 1; // No WebGL support
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

  console.log(`[PerformanceDetector] Detected tier: ${cachedTier} (score: ${score})`);
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

export function shouldEnableBloom(tier = detectPerformanceTier()) {
  return tier === 'high' || tier === 'medium';
}

export function shouldEnableAntialias(tier = detectPerformanceTier()) {
  return tier === 'high';
}

export function getGLPrecision(tier = detectPerformanceTier()) {
  return tier === 'high' ? 'highp' : 'mediump';
}
