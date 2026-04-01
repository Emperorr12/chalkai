import React, { useState, useEffect, useCallback } from "react";
import MrWhite from "./MrWhite";
import type { MrWhiteState } from "./MrWhite";

const CYCLE_DURATION = 9000; // 9s total loop
const DRAW_START = 1000;     // start drawing at 1s
const PAUSE_AT_END = 7500;   // pause before reset

// Derivative curve SVG path data
const CURVE_PATH = "M 30 110 C 50 110, 60 90, 80 60 C 100 30, 120 20, 150 20 C 180 20, 200 30, 220 50 C 240 70, 260 90, 280 80";
const TANGENT_PATH = "M 60 100 L 140 30";
const AXIS_X = "M 20 120 L 290 120";
const AXIS_Y = "M 30 10 L 30 125";

// Labels that appear sequentially
const labels = [
  { text: "f(x)", x: 270, y: 70, delay: 1.8 },
  { text: "slope = f'(x)", x: 100, y: 22, delay: 2.8 },
  { text: "tangent line", x: 145, y: 45, delay: 3.5 },
  { text: "x", x: 285, y: 135, delay: 0.6 },
  { text: "y", x: 18, y: 12, delay: 0.6 },
];

const HeroWhiteboardDemo: React.FC = () => {
  const [phase, setPhase] = useState<"waiting" | "drawing" | "done">("waiting");
  const [mrWhiteState, setMrWhiteState] = useState<MrWhiteState>("idle");
  const [cycle, setCycle] = useState(0);

  const startCycle = useCallback(() => {
    setPhase("waiting");
    setMrWhiteState("thinking");

    const t1 = setTimeout(() => {
      setPhase("drawing");
      setMrWhiteState("drawing");
    }, DRAW_START);

    const t2 = setTimeout(() => {
      setPhase("done");
      setMrWhiteState("excited");
    }, 5000);

    const t3 = setTimeout(() => {
      setMrWhiteState("idle");
    }, 5600);

    const t4 = setTimeout(() => {
      setCycle((c) => c + 1);
    }, CYCLE_DURATION);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  useEffect(() => {
    return startCycle();
  }, [cycle, startCycle]);

  const isDrawing = phase === "drawing" || phase === "done";

  return (
    <div className="relative max-w-[620px] w-full mx-auto">
      {/* Fake input prompt */}
      <div className="mb-4 flex items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm text-muted-foreground shadow-sm max-w-[420px] mx-auto">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary flex-shrink-0">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span className="text-foreground font-medium">"What is a derivative?"</span>
      </div>

      {/* Whiteboard */}
      <div className="whiteboard-surface relative overflow-hidden" style={{ minHeight: 200 }}>
        <svg
          viewBox="0 0 310 150"
          className="w-full h-auto"
          style={{ minHeight: 160 }}
        >
          {/* Axes */}
          <path
            d={AXIS_X}
            stroke="#1A1A1A"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            className={isDrawing ? "chalk-animate" : ""}
            style={{
              strokeDasharray: 270,
              strokeDashoffset: isDrawing ? 0 : 270,
              ["--draw-duration" as string]: "0.4s",
              ["--draw-delay" as string]: "0s",
            }}
          />
          <path
            d={AXIS_Y}
            stroke="#1A1A1A"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            className={isDrawing ? "chalk-animate" : ""}
            style={{
              strokeDasharray: 115,
              strokeDashoffset: isDrawing ? 0 : 115,
              ["--draw-duration" as string]: "0.3s",
              ["--draw-delay" as string]: "0.2s",
            }}
          />

          {/* Main curve f(x) */}
          <path
            d={CURVE_PATH}
            stroke="hsl(218, 55%, 51%)"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={isDrawing ? "chalk-animate" : ""}
            style={{
              strokeDasharray: 350,
              strokeDashoffset: isDrawing ? 0 : 350,
              ["--draw-duration" as string]: "1.6s",
              ["--draw-delay" as string]: "0.5s",
            }}
          />

          {/* Tangent line */}
          <path
            d={TANGENT_PATH}
            stroke="hsl(0, 68%, 60%)"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeDasharray="4 3"
            className={isDrawing ? "chalk-animate" : ""}
            style={{
              strokeDasharray: 110,
              strokeDashoffset: isDrawing ? 0 : 110,
              ["--draw-duration" as string]: "0.8s",
              ["--draw-delay" as string]: "2.2s",
            }}
          />

          {/* Point on curve */}
          <circle
            cx="90"
            cy="55"
            r="4"
            fill="hsl(0, 68%, 60%)"
            opacity={isDrawing ? 1 : 0}
            style={{
              transition: "opacity 0.3s ease",
              transitionDelay: "2.8s",
            }}
          />

          {/* Labels */}
          {labels.map((l) => (
            <text
              key={l.text}
              x={l.x}
              y={l.y}
              className="font-chalk"
              fontSize="14"
              fill={l.text.includes("slope") || l.text.includes("tangent") ? "hsl(0, 68%, 60%)" : "#1A1A1A"}
              opacity={isDrawing ? 1 : 0}
              style={{
                transition: "opacity 0.4s ease",
                transitionDelay: `${l.delay}s`,
              }}
            >
              {l.text}
            </text>
          ))}
        </svg>

        {/* Mr. White in corner */}
        <div className="absolute bottom-2 right-2">
          <MrWhite state={mrWhiteState} size={72} />
        </div>
      </div>
    </div>
  );
};

export default HeroWhiteboardDemo;
