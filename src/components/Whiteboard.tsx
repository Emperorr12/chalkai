import React, { useEffect, useState, useRef, useCallback } from "react";
import { type MrWhiteState } from "./MrWhite";
import HighlightAskTooltip from "./HighlightAskTooltip";

export interface WhiteboardElement {
  kind: "text" | "line" | "arrow" | "circle" | "rect" | "curve" | "path";
  content: string;
  color: "blue" | "white" | "red";
  size?: "small" | "medium" | "large";
  delay_seconds: number;
}

export interface WhiteboardData {
  title?: string;
  elements: WhiteboardElement[];
}

interface WhiteboardProps {
  whiteboardData: WhiteboardData | null;
  mrWhiteState?: MrWhiteState;
  className?: string;
  onAskAbout?: (text: string) => void;
}

const CHALK_COLORS = {
  blue: "#1A1A1A",
  white: "#1A1A1A",
  red: "#C41E1E",
};

const SVG_W = 640;
const SVG_H = 380;
const PAD = 24;

type Phase = "idle" | "fading-out" | "drawing" | "wiping";

const Whiteboard: React.FC<WhiteboardProps> = ({ whiteboardData, mrWhiteState = "idle", className = "", onAskAbout }) => {
  const whiteboardContainerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [activeData, setActiveData] = useState<WhiteboardData | null>(null);
  const [visibleIndices, setVisibleIndices] = useState<Set<number>>(new Set());
  const [wipeProgress, setWipeProgress] = useState(0);
  const timersRef = useRef<number[]>([]);
  const prevDataRef = useRef<WhiteboardData | null>(null);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  // Handle new data arriving
  useEffect(() => {
    if (whiteboardData === prevDataRef.current) return;
    prevDataRef.current = whiteboardData;
    clearTimers();

    if (!whiteboardData || whiteboardData.elements.length === 0) {
      setPhase("idle");
      setActiveData(null);
      setVisibleIndices(new Set());
      return;
    }

    // If there's existing content, fade out first
    if (activeData && activeData.elements.length > 0) {
      setPhase("fading-out");
      const t = window.setTimeout(() => {
        setActiveData(whiteboardData);
        setVisibleIndices(new Set());
        startDrawing(whiteboardData);
      }, 300);
      timersRef.current.push(t);
    } else {
      setActiveData(whiteboardData);
      setVisibleIndices(new Set());
      startDrawing(whiteboardData);
    }

    return clearTimers;
  }, [whiteboardData]);

  const startDrawing = useCallback((data: WhiteboardData) => {
    setPhase("drawing");
    data.elements.forEach((el, i) => {
      const delay = el.delay_seconds * 1000;
      const t = window.setTimeout(() => {
        setVisibleIndices((prev) => new Set(prev).add(i));
      }, delay);
      timersRef.current.push(t);
    });

    // Set idle after last element + draw duration
    const maxDelay = Math.max(...data.elements.map((e) => e.delay_seconds));
    const t = window.setTimeout(() => setPhase("idle"), (maxDelay + 1.5) * 1000);
    timersRef.current.push(t);
  }, []);

  const handleErase = useCallback(() => {
    clearTimers();
    setPhase("wiping");
    setWipeProgress(0);

    const duration = 600;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      setWipeProgress(progress);
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setActiveData(null);
        setVisibleIndices(new Set());
        setWipeProgress(0);
        setPhase("idle");
        prevDataRef.current = null;
      }
    };
    requestAnimationFrame(animate);
  }, [clearTimers]);

  const getYOffset = (index: number) => 60 + index * 52;

  const renderElement = (el: WhiteboardElement, index: number) => {
    const color = CHALK_COLORS[el.color] || CHALK_COLORS.blue;
    const visible = visibleIndices.has(index);
    const yOffset = getYOffset(index);
    const fontSize = el.size === "large" ? 36 : el.size === "small" ? 22 : 28;
    const fontWeight = 700;
    const scale = el.size === "large" ? 1.3 : el.size === "small" ? 0.7 : 1;

    switch (el.kind) {
      case "text":
        return (
          <text
            key={index}
            x={PAD}
            y={yOffset}
            fill={color}
            fontSize={fontSize}
            fontFamily="'Caveat', cursive"
            fontWeight={fontWeight}
            opacity={visible ? 1 : 0}
            style={{
              transition: "opacity 0.5s ease-out",
              filter: "url(#chalk-texture)",
            }}
          >
            {el.content}
          </text>
        );

      case "line": {
        const lineLen = SVG_W - PAD * 2;
        return (
          <line
            key={index}
            x1={PAD}
            y1={yOffset}
            x2={SVG_W - PAD}
            y2={yOffset}
            stroke={color}
            strokeWidth={2.5 * scale}
            strokeLinecap="round"
            strokeDasharray={lineLen}
            strokeDashoffset={visible ? 0 : lineLen}
            style={{
              transition: visible
                ? "stroke-dashoffset 1.2s ease-out"
                : "none",
              filter: "url(#chalk-texture)",
            }}
          />
        );
      }

      case "arrow": {
        const arrowLen = SVG_W * 0.55;
        return (
          <g key={index}>
            <line
              x1={PAD}
              y1={yOffset}
              x2={PAD + arrowLen}
              y2={yOffset}
              stroke={color}
              strokeWidth={2.5 * scale}
              strokeLinecap="round"
              strokeDasharray={arrowLen}
              strokeDashoffset={visible ? 0 : arrowLen}
              style={{
                transition: visible
                  ? "stroke-dashoffset 1.2s ease-out"
                  : "none",
                filter: "url(#chalk-texture)",
              }}
            />
            <polygon
              points={`${PAD + arrowLen},${yOffset - 6} ${PAD + arrowLen + 14},${yOffset} ${PAD + arrowLen},${yOffset + 6}`}
              fill={color}
              opacity={visible ? 1 : 0}
              style={{ transition: "opacity 0.3s ease-out 1s" }}
            />
            {el.content && (
              <text
                x={PAD + arrowLen + 22}
                y={yOffset + 5}
                fill={color}
                fontSize={fontSize}
                fontFamily="'Caveat', cursive"
                fontWeight={fontWeight}
                opacity={visible ? 1 : 0}
                style={{ transition: "opacity 0.5s ease-out 0.8s" }}
              >
                {el.content}
              </text>
            )}
          </g>
        );
      }

      case "circle": {
        const r = 25 * scale;
        const circumference = 2 * Math.PI * r;
        return (
          <circle
            key={index}
            cx={SVG_W / 2}
            cy={yOffset}
            r={r}
            stroke={color}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={visible ? 0 : circumference}
            style={{
              transition: visible
                ? "stroke-dashoffset 1.2s ease-out"
                : "none",
              filter: "url(#chalk-texture)",
            }}
          />
        );
      }

      case "rect": {
        const rw = 120 * scale;
        const rh = 40 * scale;
        const perimeter = 2 * (rw + rh);
        return (
          <rect
            key={index}
            x={PAD}
            y={yOffset - rh / 2}
            width={rw}
            height={rh}
            stroke={color}
            strokeWidth={2.5}
            fill="none"
            rx={4}
            strokeLinecap="round"
            strokeDasharray={perimeter}
            strokeDashoffset={visible ? 0 : perimeter}
            style={{
              transition: visible
                ? "stroke-dashoffset 1.2s ease-out"
                : "none",
              filter: "url(#chalk-texture)",
            }}
          />
        );
      }

      case "curve":
      case "path": {
        const pathD =
          el.kind === "path" && el.content
            ? el.content
            : `M${PAD} ${yOffset} Q${SVG_W / 3} ${yOffset - 40 * scale} ${SVG_W / 2} ${yOffset} Q${(SVG_W * 2) / 3} ${yOffset + 40 * scale} ${SVG_W - PAD} ${yOffset}`;
        const estimatedLen = SVG_W;
        return (
          <path
            key={index}
            d={pathD}
            stroke={color}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={estimatedLen}
            strokeDashoffset={visible ? 0 : estimatedLen}
            style={{
              transition: visible
                ? "stroke-dashoffset 1.2s ease-out"
                : "none",
              filter: "url(#chalk-texture)",
            }}
          />
        );
      }

      default:
        return null;
    }
  };

  const containerOpacity = phase === "fading-out" ? 0 : 1;

  return (
    <div
      className={`relative ${className}`}
      style={{ width: "100%", display: "flex", flexDirection: "column" }}
    >
      {/* Whiteboard frame */}
      <div
        style={{
          backgroundColor: "#FFFEF5",
          border: "8px solid #8B6914",
          borderRadius: 6,
          padding: PAD,
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 4px 20px -4px rgba(0, 0, 0, 0.15)",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Eraser button */}
        <button
          onClick={handleErase}
          disabled={!activeData || phase === "wiping"}
          className="absolute top-2 right-2 z-10 text-xs px-2.5 py-1 rounded bg-[#8B6914]/20 text-[#8B6914] hover:bg-[#8B6914]/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Erase whiteboard"
        >
          🧽 Erase
        </button>

        {/* Title */}
        {activeData?.title && (
          <div
            className="font-chalk text-lg mb-1"
            style={{
              color: "#8B6914",
              opacity: containerOpacity,
              transition: "opacity 0.3s ease",
            }}
          >
            {activeData.title}
          </div>
        )}

        {/* SVG drawing area */}
        <div
          style={{
            opacity: containerOpacity,
            transition: "opacity 0.3s ease",
            position: "relative",
            flex: 1,
            minHeight: 0,
          }}
        >
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMid meet"
            style={{ display: "block" }}
          >
            {/* Chalk texture filter */}
            <defs>
              <filter id="chalk-texture" x="-5%" y="-5%" width="110%" height="110%">
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.65"
                  numOctaves="3"
                  result="noise"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="noise"
                  scale="1.5"
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              </filter>
            </defs>

            {activeData?.elements.map((el, i) => renderElement(el, i))}

            {/* Mr. White character with pointer stick */}
            <g
              transform="translate(510, 220) scale(1.4)"
            >
              {/* Animated wrapper for state-based animations */}
              <g className={
                mrWhiteState === "idle" ? "animate-breathe" :
                mrWhiteState === "talking" ? "animate-bounce-talk" :
                mrWhiteState === "thinking" ? "animate-think" :
                mrWhiteState === "excited" ? "animate-excited" :
                mrWhiteState === "celebrating" ? "animate-celebrate" :
                ""
              } style={{ transformOrigin: "0px 0px" }}>
                {/* Body */}
                <path
                  d="M-12 15 C-12 5, -6 2, 0 2 C6 2, 12 5, 12 15 L12 32 L-12 32 Z"
                  fill="#2C2C2C"
                  stroke="#1A1A1A"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                {/* Bowtie */}
                <path
                  d="M-3 3 L0 5 L3 3 L0 2 Z"
                  fill="#3B6FCA"
                  stroke="#2E5BA8"
                  strokeWidth="0.8"
                />
                {/* Head */}
                <ellipse cx="0" cy="-8" rx="10" ry="11" fill="#F5DEB3" stroke="#D4B896" strokeWidth="1.5" />
                {/* Hair */}
                <path
                  d="M-10 -12 C-10 -19, -5 -22, 0 -22 C5 -22, 10 -19, 10 -12"
                  fill="#E8E8E8"
                  stroke="#D0D0D0"
                  strokeWidth="1.5"
                />
                {/* Glasses */}
                <circle cx="-4" cy="-9" r="4" stroke="#1A1A1A" strokeWidth="1.2" fill="none" />
                <circle cx="4" cy="-9" r="4" stroke="#1A1A1A" strokeWidth="1.2" fill="none" />
                <path d="M0 -9 L0.5 -9" stroke="#1A1A1A" strokeWidth="1" />
                {/* Eyes */}
                <circle cx="-4" cy="-9.5" r="1.2" fill="#1A1A1A" />
                <circle cx="4" cy="-9.5" r="1.2" fill="#1A1A1A" />
                {/* Blink overlays */}
                <rect x="-8" y="-12" width="8" height="4" rx="2" fill="#F5DEB3" className="animate-blink" />
                <rect x="0" y="-12" width="8" height="4" rx="2" fill="#F5DEB3" className="animate-blink" />
                {/* Mouth */}
                {mrWhiteState === "talking" ? (
                  <ellipse cx="0" cy="-3" rx="2" ry="1.5" fill="#1A1A1A" opacity="0.7" />
                ) : (
                  <path d="M-2.5 -3.5 C-1.5 -2, 1.5 -2, 2.5 -3.5" stroke="#1A1A1A" strokeWidth="1" fill="none" strokeLinecap="round" />
                )}
                {/* Left arm */}
                <path
                  d="M-10 12 C-14 10, -15 14, -13 17"
                  stroke="#2C2C2C"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* Right arm holding pointer stick */}
                <path
                  d="M10 10 C14 6, 16 2, 18 -2"
                  stroke="#2C2C2C"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* Pointer stick */}
                <line
                  x1="17"
                  y1="-1"
                  x2={mrWhiteState === "drawing" ? "-60" : "-30"}
                  y2={mrWhiteState === "drawing" ? "-50" : "-35"}
                  stroke="#8B6914"
                  strokeWidth="2"
                  strokeLinecap="round"
                  style={{ transition: "x2 0.5s ease, y2 0.5s ease" }}
                />
                {/* Pointer tip */}
                <circle
                  cx={mrWhiteState === "drawing" ? "-60" : "-30"}
                  cy={mrWhiteState === "drawing" ? "-50" : "-35"}
                  r="2"
                  fill="#C41E1E"
                  style={{ transition: "cx 0.5s ease, cy 0.5s ease" }}
                />
              </g>

              {/* Thinking dots + text */}
              {mrWhiteState === "thinking" && (
                <>
                  <circle cx="8" cy="-22" r="1.5" fill="#3B6FCA" opacity="0.6" style={{ animation: "dots-pulse 1.2s 0s infinite" }} />
                  <circle cx="12" cy="-25" r="1.5" fill="#3B6FCA" opacity="0.6" style={{ animation: "dots-pulse 1.2s 0.2s infinite" }} />
                  <circle cx="16" cy="-22" r="1.5" fill="#3B6FCA" opacity="0.6" style={{ animation: "dots-pulse 1.2s 0.4s infinite" }} />
                  <text x="12" y="-30" textAnchor="middle" fontSize="8" fill="#3B6FCA" opacity="0.5" fontFamily="Caveat, cursive" style={{ animation: "dots-pulse 1.5s infinite" }}>...</text>
                </>
              )}

              {/* Excited stars */}
              {mrWhiteState === "excited" && (
                <>
                  <polygon points="18,-18 19,-15 22,-15 20,-13 21,-10 18,-12 15,-10 16,-13 14,-15 17,-15" fill="#3B6FCA" opacity="0.7" style={{ animation: "star-burst 0.6s ease-out forwards" }} />
                  <polygon points="-14,-20 -13,-17 -10,-17 -12,-15 -11,-12 -14,-14 -17,-12 -16,-15 -18,-17 -15,-17" fill="#3B6FCA" opacity="0.5" style={{ animation: "star-burst 0.6s 0.15s ease-out forwards" }} />
                </>
              )}
            </g>
          </svg>

          {/* Selectable text overlay for highlight-and-ask */}
          {activeData && activeData.elements.length > 0 && onAskAbout && (
            <div
              ref={whiteboardContainerRef}
              className="absolute inset-0 pointer-events-auto"
              style={{ userSelect: "text" }}
            >
              <HighlightAskTooltip
                containerRef={whiteboardContainerRef as React.RefObject<HTMLElement>}
                onAsk={(text) => onAskAbout(text)}
              />
              {/* Invisible but selectable text elements matching whiteboard content */}
              <svg
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                width="100%"
                height="100%"
                preserveAspectRatio="xMidYMid meet"
                style={{ display: "block", position: "absolute", top: 0, left: 0 }}
              >
                {activeData.elements.map((el, i) => {
                  if (el.kind !== "text" || !visibleIndices.has(i)) return null;
                  const yOffset = getYOffset(i);
                  const fontSize = el.size === "large" ? 36 : el.size === "small" ? 22 : 28;
                  return (
                    <text
                      key={`sel-${i}`}
                      x={PAD}
                      y={yOffset}
                      fontSize={fontSize}
                      fontFamily="'Caveat', cursive"
                      fontWeight={700}
                      fill="transparent"
                      style={{ cursor: "text", userSelect: "text" }}
                      data-mr-white-msg="true"
                    >
                      {el.content}
                    </text>
                  );
                })}
              </svg>
            </div>
          )}

          {/* Wipe overlay for eraser animation */}
          {phase === "wiping" && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                height: "100%",
                width: `${wipeProgress * 100}%`,
                backgroundColor: "#FFFEF5",
                transition: "none",
              }}
            />
          )}
        </div>

        {/* Empty state */}
        {(!activeData || activeData.elements.length === 0) && phase === "idle" && (
          <div
            className="flex items-center justify-center font-chalk text-base"
            style={{
              color: "#8B6914",
              opacity: 0.4,
              position: "absolute",
              top: "40%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            Waiting for chalk...
          </div>
        )}
      </div>
    </div>
  );
};

export default Whiteboard;
