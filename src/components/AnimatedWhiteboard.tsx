import React, { useEffect, useRef, useState, useCallback } from "react";
import MrWhite, { type MrWhiteState } from "./MrWhite";

interface AnimatedWhiteboardProps {
  mrWhiteState?: MrWhiteState;
  className?: string;
}

const BOARD_BG = "#FFFEF5";
const FRAME_COLOR = "#8B6914";
const CHALK_BLUE = "#3B6FCA";

function animatePath(
  el: SVGPathElement | SVGLineElement,
  duration: number,
  delay: number,
  onDone?: () => void
) {
  const len = (el as SVGGeometryElement).getTotalLength();
  el.style.strokeDasharray = `${len}`;
  el.style.strokeDashoffset = `${len}`;
  el.style.opacity = "1";

  const start = performance.now() + delay * 1000;
  let raf: number;

  const step = (now: number) => {
    const elapsed = now - start;
    if (elapsed < 0) {
      raf = requestAnimationFrame(step);
      return;
    }
    const progress = Math.min(elapsed / (duration * 1000), 1);
    el.style.strokeDashoffset = `${len * (1 - progress)}`;
    if (progress < 1) {
      raf = requestAnimationFrame(step);
    } else {
      onDone?.();
    }
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

// Generate sine curve path
function sinePath(
  xStart: number,
  xEnd: number,
  yCenter: number,
  amplitude: number,
  periods: number,
  steps = 200
): string {
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = xStart + t * (xEnd - xStart);
    const y = yCenter - Math.sin(t * periods * 2 * Math.PI) * amplitude;
    points.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return points.join(" ");
}

const AnimatedWhiteboard: React.FC<AnimatedWhiteboardProps> = ({
  mrWhiteState = "idle",
  className = "",
}) => {
  const xAxisRef = useRef<SVGLineElement>(null);
  const yAxisRef = useRef<SVGLineElement>(null);
  const curveRef = useRef<SVGPathElement>(null);
  const labelRef = useRef<SVGTextElement>(null);
  const [key, setKey] = useState(0);
  const cleanupsRef = useRef<(() => void)[]>([]);

  const runAnimation = useCallback(() => {
    // Reset label
    if (labelRef.current) {
      labelRef.current.style.opacity = "0";
    }

    // Clean up previous animations
    cleanupsRef.current.forEach((c) => c());
    cleanupsRef.current = [];

    // Animate x-axis: left to right, 1s, no delay
    if (xAxisRef.current) {
      const c = animatePath(xAxisRef.current, 1, 0);
      if (c) cleanupsRef.current.push(c);
    }

    // Animate y-axis: bottom to top, 1s, 0.3s delay
    if (yAxisRef.current) {
      const c = animatePath(yAxisRef.current, 1, 0.3);
      if (c) cleanupsRef.current.push(c);
    }

    // Animate sine curve: 2s, 0.8s delay, then fade in label
    if (curveRef.current) {
      const c = animatePath(curveRef.current, 2, 0.8, () => {
        if (labelRef.current) {
          labelRef.current.style.transition = "opacity 0.5s ease-in";
          labelRef.current.style.opacity = "1";
        }
      });
      if (c) cleanupsRef.current.push(c);
    }
  }, []);

  useEffect(() => {
    // Small delay to ensure refs are set after key change
    const t = setTimeout(runAnimation, 50);
    return () => {
      clearTimeout(t);
      cleanupsRef.current.forEach((c) => c());
    };
  }, [key, runAnimation]);

  const handleReplay = () => setKey((k) => k + 1);

  // SVG viewBox dimensions
  const vw = 500;
  const vh = 320;
  const margin = { top: 40, right: 40, bottom: 50, left: 60 };
  const plotW = vw - margin.left - margin.right;
  const plotH = vh - margin.top - margin.bottom;
  const originX = margin.left;
  const originY = margin.top + plotH;
  const amplitude = plotH * 0.35;

  const sineD = sinePath(
    originX,
    originX + plotW,
    margin.top + plotH / 2,
    amplitude,
    2
  );

  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      {/* Whiteboard frame */}
      <div
        className="relative w-full rounded-lg overflow-hidden shadow-lg"
        style={{
          border: `8px solid ${FRAME_COLOR}`,
          background: BOARD_BG,
        }}
      >
        {/* Mr. White character */}
        <div className="absolute bottom-2 left-2 z-10">
          <MrWhite state={mrWhiteState} />
        </div>

        <svg
          key={key}
          viewBox={`0 0 ${vw} ${vh}`}
          className="w-full h-auto"
          style={{ minHeight: 200 }}
        >
          {/* Google Fonts Caveat */}
          <defs>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap');`}</style>
          </defs>

          {/* X-axis: drawn as a line element */}
          <line
            ref={xAxisRef}
            x1={originX}
            y1={originY}
            x2={originX + plotW}
            y2={originY}
            stroke={CHALK_BLUE}
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0"
          />

          {/* Y-axis: bottom to top */}
          <line
            ref={yAxisRef}
            x1={originX}
            y1={originY}
            x2={originX}
            y2={margin.top}
            stroke={CHALK_BLUE}
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0"
          />

          {/* Sine curve */}
          <path
            ref={curveRef}
            d={sineD}
            fill="none"
            stroke="#E05252"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0"
          />

          {/* f(x) label — fades in after curve */}
          <text
            ref={labelRef}
            x={originX + plotW + 8}
            y={margin.top + plotH / 2 + 5}
            fontFamily="'Caveat', cursive"
            fontSize="22"
            fill={CHALK_BLUE}
            opacity="0"
          >
            f(x)
          </text>

          {/* Axis labels */}
          <text
            x={originX + plotW / 2}
            y={originY + 35}
            fontFamily="'Caveat', cursive"
            fontSize="16"
            fill="#5A5A50"
            textAnchor="middle"
            opacity="0.7"
          >
            x
          </text>
          <text
            x={originX - 25}
            y={margin.top + plotH / 2}
            fontFamily="'Caveat', cursive"
            fontSize="16"
            fill="#5A5A50"
            textAnchor="middle"
            opacity="0.7"
            transform={`rotate(-90, ${originX - 25}, ${margin.top + plotH / 2})`}
          >
            y
          </text>
        </svg>
      </div>

      {/* Play again button */}
      <button
        onClick={handleReplay}
        className="mt-3 px-4 py-1.5 rounded-full border border-primary text-primary text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
        style={{ fontFamily: "'Caveat', cursive", fontSize: 18 }}
      >
        ↻ Play again
      </button>
    </div>
  );
};

export default AnimatedWhiteboard;
