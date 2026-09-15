import { useRef, useEffect } from "react";
import "./HeaderIcon.scss";

// A tesseract: 16 vertices at every corner of {-1,1}^4, with an edge wherever
// two corners differ in exactly one coordinate.
const VERTICES = [];
for (let i = 0; i < 16; i++) {
  VERTICES.push([
    i & 1 ? 1 : -1,
    i & 2 ? 1 : -1,
    i & 4 ? 1 : -1,
    i & 8 ? 1 : -1,
  ]);
}

const EDGES = [];
for (let i = 0; i < 16; i++) {
  for (let axis = 0; axis < 4; axis++) {
    const j = i ^ (1 << axis);
    if (j > i) EDGES.push([i, j]);
  }
}

const SCALE = 17;

// The rotation periods are roughly 18s, 30s and 39s, so an offset of a few
// seconds per icon keeps any two of them well apart for the whole loop.
const PHASE_STEP = 3700;

// Every icon on the page shares one animation loop.
const subscribers = new Set();
let frameId = null;
let clock = 0;
let lastFrame = 0;
let nextPhase = 0;

const rotate = (p, a, b, angle) => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const pa = p[a];
  const pb = p[b];
  p[a] = pa * cos - pb * sin;
  p[b] = pa * sin + pb * cos;
};

const project = (time) => {
  return VERTICES.map((vertex) => {
    const p = vertex.slice();

    rotate(p, 0, 3, time * 0.00035); // XW — the turn through the fourth axis
    rotate(p, 1, 2, time * 0.00021); // YZ
    rotate(p, 0, 2, time * 0.00016); // XZ

    // 4D to 3D, then 3D to 2D.
    const w = 2.4 / (2.9 - p[3]);
    const x = p[0] * w;
    const y = p[1] * w;
    const z = p[2] * w;
    const d = 4.2 / (4.2 - z);

    return { x: x * SCALE * d, y: y * SCALE * d, z };
  });
};

const drawOne = ({ lines, phase }, time) => {
  const points = project(time + phase);

  for (let i = 0; i < EDGES.length; i++) {
    const a = points[EDGES[i][0]];
    const b = points[EDGES[i][1]];
    const nearness = ((a.z + b.z) / 2 + 1.35) / 2.7;
    const line = lines[i];

    line.setAttribute("x1", a.x.toFixed(2));
    line.setAttribute("y1", a.y.toFixed(2));
    line.setAttribute("x2", b.x.toFixed(2));
    line.setAttribute("y2", b.y.toFixed(2));
    line.setAttribute("stroke-opacity", (0.22 + nearness * 0.78).toFixed(3));
    line.setAttribute("stroke-width", (0.7 + nearness * 0.9).toFixed(2));
  }
};

const drawAll = (time) => {
  subscribers.forEach((subscriber) => drawOne(subscriber, time));
};

const tick = (now) => {
  if (!lastFrame) lastFrame = now;
  clock += now - lastFrame;
  lastFrame = now;

  drawAll(clock);
  frameId = requestAnimationFrame(tick);
};

const subscribe = (lines) => {
  // Stagger each icon so no two on the page are ever at the same orientation.
  const subscriber = { lines, phase: (nextPhase += PHASE_STEP) };
  subscribers.add(subscriber);

  if (frameId === null) {
    lastFrame = 0;
    frameId = requestAnimationFrame(tick);
  } else {
    drawOne(subscriber, clock);
  }

  return () => {
    subscribers.delete(subscriber);

    if (subscribers.size === 0 && frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  };
};

const HeaderIcon = () => {
  const svgRef = useRef(null);

  useEffect(() => {
    const lines = Array.from(svgRef.current.querySelectorAll("line"));
    return subscribe(lines);
  }, []);

  return (
    <span className="header-icon">
      <svg
        ref={svgRef}
        viewBox="-50 -50 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {EDGES.map((edge, i) => (
          <line key={i} />
        ))}
      </svg>
    </span>
  );
};

export default HeaderIcon;
