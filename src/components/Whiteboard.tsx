import React, { useEffect, useState, useRef, useCallback } from "react";
import { type MrWhiteState } from "./MrWhite";
import HighlightAskTooltip from "./HighlightAskTooltip";
import { useIsMobile } from "@/hooks/use-mobile";

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
  blue: "#3B6FCA",
  white: "#F5F5F0",
  red: "#E05252",
};

const SVG_W = 640;
const SVG_H = 380;
const PAD = 24;

const Whiteboard: React.FC<WhiteboardProps> = ({
  whiteboardData,
  mrWhiteState = "idle",
  className = "",
  onAskAbout,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [phase, setPhase] = useState<"idle" | "fading-out" | "drawing">("idle");
  const [activeData, setActiveData] = useState<WhiteboardData | null>(null);
  const prevDataRef = useRef<WhiteboardData | null>(null);
  const [drawKey, setDrawKey] = useState(0);

  // On mobile, use a smaller viewBox so content appears larger
  const svgW = isMobile ? 380 : SVG_W;
  const svgH = isMobile ? 280 : SVG_H;
  const pad = isMobile ? 16 : PAD;

  useEffect(() => {
    if (whiteboardData === prevDataRef.current) return;
    prevDataRef.current = whiteboardData;

    if (!whiteboardData || whiteboardData.elements.length === 0) {
      setPhase("idle");
      setActiveData(null);
      return;
    }

    if (activeData && activeData.elements.length > 0) {
      setPhase("fading-out");
      const t = setTimeout(() => {
        setActiveData(whiteboardData);
        setDrawKey((k) => k + 1);
        setPhase("drawing");
      }, 300);
      return () => clearTimeout(t);
    } else {
      setActiveData(whiteboardData);
      setDrawKey((k) => k + 1);
      setPhase("drawing");
    }
  }, [whiteboardData]);

  const handleErase = useCallback(() => {
    setPhase("fading-out");
    setTimeout(() => {
      setActiveData(null);
      setPhase("idle");
      prevDataRef.current = null;
    }, 300);
  }, []);

  const getY = (index: number) => (isMobile ? 44 : 60) + index * (isMobile ? 40 : 52);

  const renderElement = (el: WhiteboardElement, index: number) => {
    const color = CHALK_COLORS[el.color] || CHALK_COLORS.blue;
    const delay = `${el.delay_seconds}s`;
    const y = getY(index);
    const scale = el.size === "large" ? 1.3 : el.size === "small" ? 0.7 : 1;
    const fontSize = el.size === "large" ? 36 : el.size === "small" ? 22 : 24;

    const drawStyle: React.CSSProperties = {
      strokeDasharray: 1,
      strokeDashoffset: 1,
      animation: `chalk-draw 1.2s ease-out ${delay} forwards`,
    };

    const fadeStyle: React.CSSProperties = {
      opacity: 0,
      animation: `chalk-fade 0.5s ease-out ${delay} forwards`,
    };

    // Override delay to enforce 0.4s stagger regardless of AI response
    const staggerDelay = `${index * 0.4}s`;

    const drawStyle: React.CSSProperties = {
      strokeDasharray: 1,
      strokeDashoffset: 1,
      animation: `chalk-draw 1.2s ease-out ${staggerDelay} forwards`,
    };

    const fadeStyle: React.CSSProperties = {
      opacity: 0,
      animation: `chalk-fade 0.5s ease-out ${staggerDelay} forwards`,
    };

    switch (el.kind) {
      case "text":
        return (
          <text
            key={index}
            x={pad}
            y={y}
            fill={color}
            fontSize={fontSize}
            fontFamily="'Caveat', cursive"
            fontWeight={700}
            style={fadeStyle}
          >
            {el.content}
          </text>
        );

      case "line":
        return (
          <line
            key={index}
            x1={pad}
            y1={y}
            x2={svgW - pad}
            y2={y}
            stroke={color}
            strokeWidth={2.5 * scale}
            strokeLinecap="round"
            pathLength={1}
            style={drawStyle}
          />
        );

      case "arrow": {
        const arrowLen = svgW * 0.55;
        return (
          <g key={index}>
            <line
              x1={pad}
              y1={y}
              x2={pad + arrowLen}
              y2={y}
              stroke={color}
              strokeWidth={2.5 * scale}
              strokeLinecap="round"
              pathLength={1}
              style={drawStyle}
            />
            <polygon
              points={`${pad + arrowLen},${y - 6} ${pad + arrowLen + 14},${y} ${pad + arrowLen},${y + 6}`}
              fill={color}
              style={{
                opacity: 0,
                animation: `chalk-fade 0.3s ease-out calc(${el.delay_seconds}s + 1s) forwards`,
              }}
            />
            {el.content && (
              <text
                x={pad + arrowLen + 22}
                y={y + 5}
                fill={color}
                fontSize={fontSize}
                fontFamily="'Caveat', cursive"
                fontWeight={700}
                style={{
                  opacity: 0,
                  animation: `chalk-fade 0.5s ease-out calc(${el.delay_seconds}s + 0.8s) forwards`,
                }}
              >
                {el.content}
              </text>
            )}
          </g>
        );
      }

      case "circle": {
        const r = 25 * scale;
        return (
          <circle
            key={index}
            cx={svgW / 2}
            cy={y}
            r={r}
            stroke={color}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            pathLength={1}
            style={drawStyle}
          />
        );
      }

      case "rect": {
        const rw = 120 * scale;
        const rh = 40 * scale;
        return (
          <rect
            key={index}
            x={pad}
            y={y - rh / 2}
            width={rw}
            height={rh}
            stroke={color}
            strokeWidth={2.5}
            fill="none"
            rx={4}
            strokeLinecap="round"
            pathLength={1}
            style={drawStyle}
          />
        );
      }

      case "curve":
      case "path": {
        const d =
          el.kind === "path" && el.content
            ? el.content
            : `M${pad} ${y} Q${svgW / 3} ${y - 40 * scale} ${svgW / 2} ${y} Q${(svgW * 2) / 3} ${y + 40 * scale} ${svgW - pad} ${y}`;
        return (
          <path
            key={index}
            d={d}
            stroke={color}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            pathLength={1}
            style={drawStyle}
          />
        );
      }

      default:
        return null;
    }
  };

  const hasContent = activeData && activeData.elements.length > 0;

  // Dynamically scale viewBox height to element count so text auto-sizes to fill the board
  const dynamicSvgH = isMobile ? svgH : Math.max(SVG_H, (activeData?.elements.length || 0) * 52 + 80);

  return (
    <div className={`relative ${className}`} style={{ width: "100%", height: isMobile ? undefined : "100%" }}>
      {/* CSS animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap');
        @keyframes chalk-draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes chalk-fade {
          to { opacity: 1; }
        }
      `}</style>

      {/* Whiteboard frame */}
      <div
        style={{
          backgroundColor: "#FFFEF5",
          border: "8px solid #8B6914",
          borderRadius: 6,
          padding: pad,
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 4px 20px -4px rgba(0, 0, 0, 0.15)",
          height: isMobile ? undefined : "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Eraser */}
        <button
          onClick={handleErase}
          disabled={!hasContent}
          className="absolute top-2 right-2 z-10 text-xs px-2.5 py-1 rounded bg-[#8B6914]/20 text-[#8B6914] hover:bg-[#8B6914]/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Erase whiteboard"
        >
          🧽 Erase
        </button>

        {/* Title */}
        {activeData?.title && (
          <div
            className="text-lg mb-1"
            style={{
              fontFamily: "'Caveat', cursive",
              color: "#8B6914",
              opacity: phase === "fading-out" ? 0 : 1,
              transition: "opacity 0.3s ease",
            }}
          >
            {activeData.title}
          </div>
        )}

        {/* SVG surface */}
        <div
          style={{
            opacity: phase === "fading-out" ? 0 : 1,
            transition: "opacity 0.3s ease",
            position: "relative",
            flex: isMobile ? undefined : 1,
            minHeight: 0,
          }}
        >
          <svg
            key={drawKey}
            viewBox={`0 0 ${svgW} ${dynamicSvgH}`}
            width="100%"
            height={isMobile ? undefined : "100%"}
            preserveAspectRatio="xMidYMin meet"
            style={{ display: "block" }}
          >
            {activeData?.elements.map((el, i) => renderElement(el, i))}
          </svg>

          {/* Selectable overlay for highlight-and-ask */}
          {hasContent && onAskAbout && (
            <div
              ref={containerRef}
              className="absolute inset-0 pointer-events-auto"
              style={{ userSelect: "text" }}
            >
              <HighlightAskTooltip
                containerRef={containerRef as React.RefObject<HTMLElement>}
                onAsk={(text) => onAskAbout(text)}
              />
              <svg
                viewBox={`0 0 ${svgW} ${dynamicSvgH}`}
                width="100%"
                preserveAspectRatio="xMidYMid meet"
                style={{ display: "block", position: "absolute", top: 0, left: 0 }}
              >
                {activeData!.elements.map((el, i) => {
                  if (el.kind !== "text") return null;
                  const y = getY(i);
                  const fontSize = el.size === "large" ? 36 : el.size === "small" ? 22 : 24;
                  return (
                    <text
                      key={`sel-${i}`}
                      x={pad}
                      y={y}
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
        </div>

        {/* Empty state */}
        {!hasContent && phase === "idle" && (
          <div
            className="flex items-center justify-center text-2xl lg:text-3xl"
            style={{
              fontFamily: "'Caveat', cursive",
              color: "#8B6914",
              opacity: 0.4,
              position: "absolute",
              top: "50%",
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
