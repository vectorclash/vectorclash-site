import React, { useMemo } from "react";
// import GradientBackground from "./GradientBackground";
import HeaderScene from "./three/r3f/HeaderScene";
import "./ThreeHeaderBackground.scss";
import GradientGenerator from "./utils/GradientGenerator";

export default function ThreeHeaderBackground() {
  const colors = useMemo(() => {
    let colorAmount = 3;
    let randomChance = Math.random();
    let colorRandom = false;
    if (randomChance > 0.5) {
      colorRandom = false;
      colorAmount += Math.round(Math.random() * 3);
    }

    return new GradientGenerator(colorAmount, colorRandom).colors;
  }, []);

  return (
    <div className="three-background">
      {/* <GradientBackground /> */}
      <HeaderScene colors={colors} />
    </div>
  );
}
