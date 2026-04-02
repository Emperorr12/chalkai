import React, { useState, useEffect, useCallback, useRef } from "react";
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

// Phases: drawing → hold → erasing → drawn-blank
// "drawn-blank" is a brief moment where everything is already erased,
// before we restart. We never use transition:"none" mid-cycle.
type Phase = "drawing" | "hold" | "erasing" | "drawn-blank";

const HeroWhiteboardDemo: React.FC = () => {
  const [phase, setPhase] = useState<Phase>("drawing");
  const [mrWhiteState, setMrWhiteState] = useState<MrWhiteState>("drawing");
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    timersRef.current.push(setTimeout(fn, ms));
  }, []);

  const runCycle = useCallback(() => {
    clearTimers();

    // Start: drawing phase (strokes animate in over ~4s)
    setPhase("drawing");
    setMrWhiteState("drawing");

    // 4.5s: done drawing, hold and celebrate
    schedule(() => {
      setPhase("hold");
      setMrWhiteState("excited");
    }, 4500);

    // 5.1s: calm down
    schedule(() => {
      setMrWhiteState("idle");
    }, 5100);

    // 7s: start erasing (smooth reverse over ~3s)
    schedule(() => {
      setPhase("erasing");
      setMrWhiteState("drawing");
    }, 7000);

    // 10s: erase complete, brief blank
    schedule(() => {
      setPhase("drawn-blank");
      setMrWhiteState("thinking");
    }, 10000);

    // 11s: restart cycle
    schedule(() => {
      runCycle();
    }, 11000);
  }, [clearTimers, schedule]);

  useEffect(() => {
    runCycle();
    return clearTimers;
  }, [runCycle, clearTimers]);

  const getStrokeStyle = (dashLen: number, drawDuration: string, drawDelay: string) => {
    switch (phase) {
      case "drawing":
      case "hold":
        return {
          strokeDasharray: dashLen,
          strokeDashoffset: 0,
          transition: `stroke-dashoffset ${drawDuration} ease-out ${drawDelay}`,
        };
      case "erasing":
        return {
          strokeDasharray: dashLen,
          strokeDashoffset: dashLen,
          transition: "stroke-dashoffset 2.8s ease-in-out 0s",
        };
      case "drawn-blank":
        // Already erased — keep hidden, no abrupt jump
        return {
          strokeDasharray: dashLen,
          strokeDashoffset: dashLen,
          transition: "stroke-dashoffset 0.01s linear 0s",
        };
    }
  };

  const getLabelOpacity = (delay: number) => {
    switch (phase) {
      case "drawing":
      case "hold":
        return { opacity: 1, transition: `opacity 0.5s ease-out ${delay}s` };
      case "erasing":
        return { opacity: 0, transition: "opacity 2s ease-in-out 0s" };
      case "drawn-blank":
        return { opacity: 0, transition: "opacity 0.01s linear 0s" };
    }
  };

  const getDotOpacity = () => {
    switch (phase) {
      case "drawing":
      case "hold":
        return { opacity: 1, transition: "opacity 0.4s ease-out 2.8s" };
      case "erasing":
        return { opacity: 0, transition: "opacity 2s ease-in-out 0s" };
      case "drawn-blank":
        return { opacity: 0, transition: "opacity 0.01s linear 0s" };
    }
  };

  return (
    <div className="relative max-w-[806px] w-full mx-auto px-0">
      {/* Fake input prompt */}
      <div className="mb-3 sm:mb-4 flex items-center gap-2 rounded-full border border-border bg-card px-4 sm:px-5 py-2.5 sm:py-3 text-sm text-muted-foreground shadow-sm max-w-[420px] mx-auto">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary flex-shrink-0">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span className="text-foreground font-medium">"What is a derivative?"</span>
      </div>

      {/* Whiteboard */}
      <div className="whiteboard-surface relative overflow-hidden" style={{ minHeight: 260 }}>
        <svg viewBox="0 0 310 150" className="w-full h-auto" style={{ minHeight: 208 }}>
          {/* Axes */}
          <path
            d={AXIS_X}
            stroke="#1A1A1A"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            style={getStrokeStyle(270, "0.5s", "0s")}
          />
          <path
            d={AXIS_Y}
            stroke="#1A1A1A"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            style={getStrokeStyle(115, "0.4s", "0.2s")}
          />

          {/* Main curve f(x) */}
          <path
            d={CURVE_PATH}
            stroke="hsl(218, 55%, 51%)"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={getStrokeStyle(350, "1.8s", "0.5s")}
          />

          {/* Tangent line */}
          <path
            d={TANGENT_PATH}
            stroke="hsl(0, 68%, 60%)"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            style={getStrokeStyle(110, "0.9s", "2.2s")}
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
        <div className="absolute bottom-2 right-12">
          <MrWhite state={mrWhiteState} size={140} />
        </div>
      </div>
    </div>
  );
};

export default HeroWhiteboardDemo;
