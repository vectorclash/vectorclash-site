import React, { lazy, Suspense, useMemo, useState } from "react";
import "./HeroBackground.scss";
import GradientGenerator from "./utils/GradientGenerator";

// three, drei and postprocessing together are the bulk of the bundle. Loading
// them statically meant the hero's markup, type and layout all waited on ~1.4MB
// of WebGL that paints a background. Split out, the hero renders immediately
// on the flat fallback and the scene fades in over it when it arrives.
const HeroScene = lazy(() => import("./three/r3f/HeroScene"));

export default function HeroBackground() {
  const colors = useMemo(() => {
    let colorAmount = 3;
    let randomChance = Math.random();
    let colorRandom = false;
    if (randomChance > 0.5) {
      colorRandom = false;
      colorAmount += Math.round(Math.random() * 3);
    }

    return new GradientGenerator(colorAmount, colorRandom, true).colors;
  }, []);

  // The canvas is held at zero opacity until the scene reports a frame actually
  // drawn. Revealing it on mount instead swapped the CSS gradient for WebGL in
  // a single frame, which is one of the flashes this is here to remove.
  const [sceneReady, setSceneReady] = useState(false);

  // The same stops the scene's own shader starts from, so the handover from
  // fallback to canvas is a change of texture rather than of colour.
  const fallback = useMemo(
    () =>
      `linear-gradient(42deg, ${colors
        .map((c) => c.toHexString())
        .join(", ")})`,
    [colors]
  );

  return (
    <div className="three-background" style={{ backgroundImage: fallback }}>
      <Suspense fallback={null}>
        <HeroScene
          colors={colors}
          fallback={fallback}
          ready={sceneReady}
          onReady={() => setSceneReady(true)}
        />
      </Suspense>
    </div>
  );
}
