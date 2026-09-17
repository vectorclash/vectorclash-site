import { useCallback, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { stepLevel } from '../../utils/qualityLevel';
import useQuality from '../../utils/useQuality';

// How good is good enough. drei's default bounds judge a device against its own
// refresh rate, which on a 120Hz phone means demanding 100fps before it will
// admit the device is coping -- so a perfectly happy iPhone would sit at the
// bottom of the ladder forever. Nothing in this scene is read at 120Hz; 60 is
// the ceiling worth aiming at, and a device is declining only once it is well
// under it.
const bounds = (refreshrate) => {
  const target = Math.min(refreshrate || 60, 60);
  return [target * 0.75, target * 0.95];
};

// The canvas resolution is the one knob that can move without anything
// appearing or disappearing, so it moves on its own, immediately, rather than
// waiting for the ladder. Capped at the display's real ratio -- asking for 1.5
// on a 1x monitor is supersampling a gradient nobody can see the difference in.
function DprDriver() {
  const setDpr = useThree((state) => state.setDpr);
  const { settings } = useQuality();

  useEffect(() => {
    const ratio = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
    setDpr(Math.min(settings.dpr, ratio));
  }, [setDpr, settings.dpr]);

  return null;
}

/**
 * Watches the frame rate and walks the shared quality level up or down.
 *
 * Mount one of these inside each <Canvas>. They all drive the same store, which
 * is fine because only one canvas renders at a time -- useRenderWhenVisible
 * parks the other on frameloop="never", and a parked canvas runs no useFrame
 * and so takes no samples.
 *
 * The sampling window is deliberately long. Twelve 250ms windows is three
 * seconds before the first verdict, which puts the whole of startup -- shader
 * compiles, texture uploads, the hero's entrance tween -- safely outside the
 * first judgement. A device is never demoted for being slow to get going.
 *
 * flipflops latches the whole thing after four changes of direction. A device
 * sitting exactly on a boundary would otherwise fade stars in and out every few
 * seconds forever, which reads as a fault rather than as an adjustment; after
 * four flips it stops sampling and keeps whatever level it is on.
 */
export default function QualityGovernor() {
  const onDecline = useCallback(() => stepLevel(-1), []);
  const onIncline = useCallback(() => stepLevel(1), []);

  return (
    <PerformanceMonitor
      iterations={12}
      ms={250}
      threshold={0.7}
      flipflops={4}
      bounds={bounds}
      onDecline={onDecline}
      onIncline={onIncline}
    >
      <DprDriver />
    </PerformanceMonitor>
  );
}
