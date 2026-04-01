import React, { useState, useEffect, useCallback } from "react";
import MrWhite from "./MrWhite";
import type { MrWhiteState } from "./MrWhite";

// Derivative curve SVG path data
const CURVE_PATH = "M 30 110 C 50 110, 60 90, 80 60 C 100 30, 120 20, 150 20 C 180 20, 200 30, 220 50 C 240 70, 260 90, 280 80";
const TANGENT_PATH = "M 60 100 L 140 30";
const AXIS_X = "M 20 120 L 290 120";
const AXIS_Y = "M 30 10 L 30 125";

const labels = [
  { text: "f(x)", x: 270, y: 70, delay: 1.8 },
  { text: "slope = f'(x)", x: 100, y: 22, delay: 2.8 },
  { text: "tangent line", x: 145, y: 45, delay: 3.5 },
  { text: "x", x: 285, y: 135, delay: 0.6 },
  { text: "y", x: 18, y: 12, delay: 0.6 },
];

type Phase = "waiting" | "drawing" | "hold" | "erasing" | "pause";

const HeroWhiteboardDemo: React.FC = () => {
  const [phase, setPhase] = useState<Phase>("waiting");
  const [mrWhiteState, setMrWhiteState] = useState<MrWhiteState>("idle");

  const runCycle = useCallback(() => {
    // Phase 1: thinking before drawing
    setPhase("waiting");
    setMrWhiteState("thinking");

    const timers: ReturnType<typeof setTimeout>[] = [];

    // 1s: start drawing
    timers.push(setTimeout(() => {
      setPhase("drawing");
      setMrWhiteState("drawing");
    }, 1000));

    // 5s: drawing done, hold
    timers.push(setTimeout(() => {
      setPhase("hold");
      setMrWhiteState("excited");
    }, 5000));

    // 5.6s: calm down
    timers.push(setTimeout(() => {
      setMrWhiteState("idle");
    }, 5600));

    // 7.5s: start erasing (reverse)
    timers.push(setTimeout(() => {
      setPhase("erasing");
      setMrWhiteState("drawing");
    }, 7500));

    // 11.5s: fully erased, pause
    timers.push(setTimeout(() => {
      setPhase("pause");
      setMrWhiteState("idle");
    }, 11500));

    // 12.5s: restart
    timers.push(setTimeout(() => {
      runCycle();
    }, 12500));

    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    return runCycle();
  }, [runCycle]);

  const isVisible = phase === "drawing" || phase === "hold";
  const isErasing = phase === "erasing";

  // For drawing: strokeDashoffset goes from full → 0 (forward animation)
  // For erasing: strokeDashoffset goes from 0 → full (reverse via transition)
  // For waiting/pause: instant hide (no transition)
  const getStrokeStyle = (dashLen: number, drawDuration: string, drawDelay: string) => {
    if (phase === "waiting" || phase === "pause") {
      return {
        strokeDasharray: dashLen,
        strokeDashoffset: dashLen,
        transition: "none",
      };
    }
    if (phase === "drawing" || phase === "hold") {
      return {
        strokeDasharray: dashLen,
        strokeDashoffset: 0,
        transition: `stroke-dashoffset ${drawDuration} ease-out ${drawDelay}`,
      };
    }
    // erasing — reverse with matching duration, no delay (all erase together)
    return {
      strokeDasharray: dashLen,
      strokeDashoffset: dashLen,
      transition: `stroke-dashoffset 2.5s ease-in 0s`,
    };
  };

  const getLabelOpacity = (delay: number) => {
    if (phase === "waiting" || phase === "pause") {
      return { opacity: 0, transition: "none" };
    }
    if (isVisible) {
      return { opacity: 1, transition: `opacity 0.4s ease ${delay}s` };
    }
    // erasing
    return { opacity: 0, transition: "opacity 1.5s ease-in 0s" };
  };

  const getDotOpacity = () => {
    if (phase === "waiting" || phase === "pause") {
      return { opacity: 0, transition: "none" };
    }
    if (isVisible) {
      return { opacity: 1, transition: "opacity 0.3s ease 2.8s" };
    }
    return { opacity: 0, transition: "opacity 1.5s ease-in 0s" };
  };

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
        <svg viewBox="0 0 310 150" className="w-full h-auto" style={{ minHeight: 160 }}>
          {/* Axes */}
          <path
            d={AXIS_X}
            stroke="#1A1A1A"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            style={getStrokeStyle(270, "0.4s", "0s")}
          />
          <path
            d={AXIS_Y}
            stroke="#1A1A1A"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            style={getStrokeStyle(115, "0.3s", "0.2s")}
          />

          {/* Main curve f(x) */}
          <path
            d={CURVE_PATH}
            stroke="hsl(218, 55%, 51%)"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={getStrokeStyle(350, "1.6s", "0.5s")}
          />

          {/* Tangent line */}
          <path
            d={TANGENT_PATH}
            stroke="hsl(0, 68%, 60%)"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            style={getStrokeStyle(110, "0.8s", "2.2s")}
          />

          {/* Point on curve */}
          <circle
            cx="90"
            cy="55"
            r="4"
            fill="hsl(0, 68%, 60%)"
            style={getDotOpacity()}
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
              style={getLabelOpacity(l.delay)}
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
