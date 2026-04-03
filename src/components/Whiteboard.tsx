import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import MrWhite, { type MrWhiteState } from "./MrWhite";
import HighlightAskTooltip from "./HighlightAskTooltip";
import { useIsMobile } from "@/hooks/use-mobile";

export interface WhiteboardElement {
  kind: "text" | "line" | "curve" | "circle" | "rect" | "axis" | "point" | "arrow" | "path";
  content: string;
  color: "blue" | "white" | "red" | "green" | "yellow";
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

const CHALK_COLORS: Record<string, string> = {
  blue: "#F5F0E8",
  white: "#F5F0E8",
  red: "#E8C84A",
  green: "#F5F0E8",
  yellow: "#E8C84A",
};

const SVG_W = 640;
const SVG_H = 400;
const PAD = 28;

/** Compute the approximate center position of an element in SVG coordinates */
function getElementPosition(
  el: WhiteboardElement,
  index: number,
  svgW: number,
  svgH: number,
  pad: number,
  isMobile: boolean,
): { x: number; y: number } {
  const autoY = (isMobile ? 44 : 60) + index * (isMobile ? 48 : 58);

  switch (el.kind) {
    case "text":
      return { x: pad + 40, y: autoY };
    case "line":
    case "arrow": {
      const m = el.content.match(/([\d.]+),([\d.]+)\s+to\s+([\d.]+),([\d.]+)/i);
      if (m) {
        return { x: (Number(m[1]) + Number(m[3])) / 2, y: (Number(m[2]) + Number(m[4])) / 2 };
      }
      return { x: svgW / 2, y: autoY };
    }
    case "circle": {
      const m = el.content.match(/([\d.]+),([\d.]+)/);
      if (m) return { x: Number(m[1]), y: Number(m[2]) };
      return { x: svgW / 2, y: autoY };
    }
    case "rect": {
      const m = el.content.match(/([\d.]+),([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
      if (m) return { x: Number(m[1]) + Number(m[3]) / 2, y: Number(m[2]) + Number(m[4]) / 2 };
      return { x: pad + 70, y: autoY };
    }
    case "point": {
      const m = el.content.match(/([\d.]+),([\d.]+)/);
      if (m) return { x: Number(m[1]), y: Number(m[2]) };
      return { x: svgW / 2, y: autoY };
    }
    case "axis":
      return { x: pad + 40, y: svgH - 60 };
    case "curve":
    case "path":
      return { x: svgW / 3, y: autoY };
    default:
      return { x: svgW / 2, y: autoY };
  }
}

const Whiteboard: React.FC<WhiteboardProps> = ({
  whiteboardData,
  mrWhiteState = "idle",
  className = "",
  onAskAbout,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [phase, setPhase] = useState<"idle" | "fading-out" | "drawing">("idle");
  const [activeData, setActiveData] = useState<WhiteboardData | null>(null);
  const prevDataRef = useRef<WhiteboardData | null>(null);
  const [drawKey, setDrawKey] = useState(0);
  const [activeElementIndex, setActiveElementIndex] = useState(-1);

  const svgW = isMobile ? 380 : SVG_W;
  const svgH = isMobile ? 300 : SVG_H;
  const pad = isMobile ? 16 : PAD;
  const mrWhiteSize = isMobile ? 64 : 100;

  useEffect(() => {
    if (whiteboardData === prevDataRef.current) return;
    prevDataRef.current = whiteboardData;

    if (!whiteboardData || whiteboardData.elements.length === 0) {
      setPhase("idle");
      setActiveData(null);
      setActiveElementIndex(-1);
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

  // Animate Mr. White through element positions as they draw
  useEffect(() => {
    if (phase !== "drawing" || !activeData || activeData.elements.length === 0) {
      setActiveElementIndex(-1);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    activeData.elements.forEach((el, i) => {
      const delayMs = (el.delay_seconds ?? i * 0.4) * 1000;
      timers.push(setTimeout(() => setActiveElementIndex(i), delayMs));
    });

    // Return to rest after last element finishes drawing
    const lastEl = activeData.elements[activeData.elements.length - 1];
    const lastDelay = (lastEl.delay_seconds ?? (activeData.elements.length - 1) * 0.4) * 1000;
    timers.push(setTimeout(() => setActiveElementIndex(-1), lastDelay + 2000));

    return () => timers.forEach(clearTimeout);
  }, [phase, activeData, drawKey]);

  const handleErase = useCallback(() => {
    setPhase("fading-out");
    setActiveElementIndex(-1);
    setTimeout(() => {
      setActiveData(null);
      setPhase("idle");
      prevDataRef.current = null;
    }, 300);
  }, []);

  // Compute Mr. White's position as CSS percentages within the container
  const mrWhitePosition = useMemo(() => {
    const dynamicH = isMobile ? svgH : Math.max(200, (activeData?.elements.length || 0) * 58 + 100);
    // Default: bottom-right
    if (activeElementIndex < 0 || !activeData || activeElementIndex >= activeData.elements.length) {
      return { bottom: isMobile ? 4 : 8, right: isMobile ? 8 : 16, top: "auto" as const, left: "auto" as const };
    }

    const el = activeData.elements[activeElementIndex];
    const pos = getElementPosition(el, activeElementIndex, svgW, dynamicH, pad, isMobile);

    // Convert SVG coords to percentage of container, offset so Mr. White sits to the right/below
    const leftPct = Math.min(Math.max((pos.x / svgW) * 100 - 5, 2), 75);
    const topPct = Math.min(Math.max((pos.y / dynamicH) * 100 - 15, 2), 70);

    return { top: `${topPct}%`, left: `${leftPct}%`, bottom: "auto" as const, right: "auto" as const };
  }, [activeElementIndex, activeData, svgW, svgH, pad, isMobile]);

  // Auto-layout: compute Y positions for elements that don't specify coordinates
  const getAutoY = (index: number) => (isMobile ? 44 : 60) + index * (isMobile ? 48 : 58);

  const renderElement = (el: WhiteboardElement, index: number) => {
    const color = CHALK_COLORS[el.color] || CHALK_COLORS.blue;
    const delay = `${el.delay_seconds ?? index * 0.4}s`;
    const fontSize = el.size === "large" ? 34 : el.size === "small" ? 22 : 28;

    // Common stroke-dasharray draw animation style
    const drawAnim = (dur = "1.2s"): React.CSSProperties => ({
      strokeDasharray: 1,
      strokeDashoffset: 1,
      animation: `chalk-stroke ${dur} ease-out ${delay} forwards`,
    });

    const fadeAnim: React.CSSProperties = {
      opacity: 0,
      animation: `chalk-fade 0.6s ease-out ${delay} forwards`,
    };

    switch (el.kind) {
      case "text": {
        const y = getAutoY(index);
        return (
          <text
            key={index}
            x={pad}
            y={y}
            fill={color}
            fontSize={fontSize}
            fontFamily="'Caveat', cursive"
            fontWeight={700}
            style={fadeAnim}
          >
            {el.content}
          </text>
        );
      }

      case "line": {
        // Parse "x1,y1 to x2,y2" or fall back to horizontal line
        const match = el.content.match(/([\d.]+),([\d.]+)\s+to\s+([\d.]+),([\d.]+)/i);
        const hasArrow = el.content.toLowerCase().includes("arrow");
        let x1: number, y1: number, x2: number, y2: number;

        if (match) {
          [x1, y1, x2, y2] = match.slice(1, 5).map(Number);
        } else {
          const y = getAutoY(index);
          x1 = pad; y1 = y; x2 = svgW - pad; y2 = y;
        }

        const arrowId = `arrow-${drawKey}-${index}`;
        return (
          <g key={index}>
            {hasArrow && (
              <defs>
                <marker id={arrowId} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill={color} />
                </marker>
              </defs>
            )}
            <line
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={color}
              strokeWidth={2.5}
              strokeLinecap="round"
              pathLength={1}
              markerEnd={hasArrow ? `url(#${arrowId})` : undefined}
              style={drawAnim("1.0s")}
            />
          </g>
        );
      }

      case "arrow": {
        // Shorthand: always draws an arrow line
        const match = el.content.match(/([\d.]+),([\d.]+)\s+to\s+([\d.]+),([\d.]+)/i);
        let x1: number, y1: number, x2: number, y2: number;
        if (match) {
          [x1, y1, x2, y2] = match.slice(1, 5).map(Number);
        } else {
          const y = getAutoY(index);
          x1 = pad; y1 = y; x2 = svgW - pad * 3; y2 = y;
        }
        const arrowId = `arrowhead-${drawKey}-${index}`;
        const label = el.content.replace(/([\d.]+),([\d.]+)\s+to\s+([\d.]+),([\d.]+)/i, "").trim();
        return (
          <g key={index}>
            <defs>
              <marker id={arrowId} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill={color} />
              </marker>
            </defs>
            <line
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={color} strokeWidth={2.5} strokeLinecap="round"
              pathLength={1} markerEnd={`url(#${arrowId})`}
              style={drawAnim("1.0s")}
            />
            {label && (
              <text
                x={x2 + 14} y={y2 + 5}
                fill={color} fontSize={fontSize - 2}
                fontFamily="'Caveat', cursive" fontWeight={700}
                style={{ opacity: 0, animation: `chalk-fade 0.5s ease-out calc(${delay} + 0.8s) forwards` }}
              >
                {label}
              </text>
            )}
          </g>
        );
      }

      case "curve": {
        // Parse bezier: "M x y C cx1 cy1 cx2 cy2 ex ey" or "x1,y1 cx,cy x2,y2"
        let d: string;
        if (el.content.trim().startsWith("M") || el.content.trim().startsWith("m")) {
          d = el.content.trim();
        } else {
          // Simple 3-point curve: start, control, end
          const nums = el.content.match(/[\d.]+/g)?.map(Number);
          if (nums && nums.length >= 6) {
            d = `M${nums[0]} ${nums[1]} Q${nums[2]} ${nums[3]} ${nums[4]} ${nums[5]}`;
          } else {
            const y = getAutoY(index);
            d = `M${pad} ${y} Q${svgW / 2} ${y - 60} ${svgW - pad} ${y}`;
          }
        }
        return (
          <path
            key={index}
            d={d}
            stroke={color} strokeWidth={2.5} fill="none"
            strokeLinecap="round" pathLength={1}
            style={drawAnim("1.4s")}
          />
        );
      }

      case "path": {
        return (
          <path
            key={index}
            d={el.content}
            stroke={color} strokeWidth={2.5} fill="none"
            strokeLinecap="round" pathLength={1}
            style={drawAnim("1.4s")}
          />
        );
      }

      case "circle": {
        // Parse "cx,cy radius" or "cx,cy radius label"
        const parts = el.content.match(/([\d.]+),([\d.]+)\s+([\d.]+)\s*(.*)/);
        let cx: number, cy: number, r: number, label = "";
        if (parts) {
          cx = Number(parts[1]); cy = Number(parts[2]); r = Number(parts[3]);
          label = parts[4] || "";
        } else {
          cx = svgW / 2; cy = getAutoY(index); r = 30;
          label = el.content.replace(/^[\d.,\s]+/, "").trim() || el.content;
        }
        return (
          <g key={index}>
            <circle
              cx={cx} cy={cy} r={r}
              stroke={color} strokeWidth={2.5} fill="none"
              strokeLinecap="round" pathLength={1}
              style={drawAnim("1.2s")}
            />
            {label && (
              <text
                x={cx} y={cy + 5}
                fill={color} fontSize={fontSize - 4}
                fontFamily="'Caveat', cursive" fontWeight={700}
                textAnchor="middle"
                style={{ opacity: 0, animation: `chalk-fade 0.5s ease-out calc(${delay} + 0.6s) forwards` }}
              >
                {label}
              </text>
            )}
          </g>
        );
      }

      case "rect": {
        // Parse "x,y width height" or "x,y width height label"
        const parts = el.content.match(/([\d.]+),([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(.*)/);
        let rx: number, ry: number, rw: number, rh: number, label = "";
        if (parts) {
          rx = Number(parts[1]); ry = Number(parts[2]);
          rw = Number(parts[3]); rh = Number(parts[4]);
          label = parts[5] || "";
        } else {
          const y = getAutoY(index);
          rx = pad; ry = y - 20; rw = 140; rh = 40;
          // Strip leading coordinate-like patterns (e.g. "180,60 Label") to show only the text
          label = el.content.replace(/^[\d.,\s]+/, "").trim() || el.content;
        }
        return (
          <g key={index}>
            <rect
              x={rx} y={ry} width={rw} height={rh}
              stroke={color} strokeWidth={2.5} fill="none"
              rx={4} strokeLinecap="round" pathLength={1}
              style={drawAnim("1.2s")}
            />
            {label && (
              <text
                x={rx + rw / 2} y={ry + rh / 2 + 6}
                fill={color} fontSize={fontSize - 4}
                fontFamily="'Caveat', cursive" fontWeight={700}
                textAnchor="middle"
                style={{ opacity: 0, animation: `chalk-fade 0.5s ease-out calc(${delay} + 0.6s) forwards` }}
              >
                {label}
              </text>
            )}
          </g>
        );
      }

      case "axis": {
        // Parse "xLabel,yLabel" or just draw default axes
        const labels = el.content.split(",").map(s => s.trim());
        const xLabel = labels[0] || "x";
        const yLabel = labels[1] || "y";
        // Draw axes in center-left area
        const ox = pad + 40, oy = svgH - 60;
        const axisW = svgW - pad * 2 - 80;
        const axisH = svgH - 120;
        const arrowIdX = `axis-x-${drawKey}-${index}`;
        const arrowIdY = `axis-y-${drawKey}-${index}`;
        return (
          <g key={index}>
            <defs>
              <marker id={arrowIdX} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill={color} />
              </marker>
              <marker id={arrowIdY} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill={color} />
              </marker>
            </defs>
            {/* X axis */}
            <line
              x1={ox} y1={oy} x2={ox + axisW} y2={oy}
              stroke={color} strokeWidth={2} strokeLinecap="round"
              pathLength={1} markerEnd={`url(#${arrowIdX})`}
              style={drawAnim("1.0s")}
            />
            {/* Y axis */}
            <line
              x1={ox} y1={oy} x2={ox} y2={oy - axisH}
              stroke={color} strokeWidth={2} strokeLinecap="round"
              pathLength={1} markerEnd={`url(#${arrowIdY})`}
              style={{ ...drawAnim("1.0s"), animationDelay: `calc(${delay} + 0.3s)` }}
            />
            {/* Tick marks on X */}
            {[0.25, 0.5, 0.75].map((t, ti) => (
              <line key={`xt-${ti}`}
                x1={ox + axisW * t} y1={oy - 4} x2={ox + axisW * t} y2={oy + 4}
                stroke={color} strokeWidth={1.5}
                style={{ opacity: 0, animation: `chalk-fade 0.3s ease-out calc(${delay} + ${0.6 + ti * 0.15}s) forwards` }}
              />
            ))}
            {/* Tick marks on Y */}
            {[0.25, 0.5, 0.75].map((t, ti) => (
              <line key={`yt-${ti}`}
                x1={ox - 4} y1={oy - axisH * t} x2={ox + 4} y2={oy - axisH * t}
                stroke={color} strokeWidth={1.5}
                style={{ opacity: 0, animation: `chalk-fade 0.3s ease-out calc(${delay} + ${0.6 + ti * 0.15}s) forwards` }}
              />
            ))}
            {/* Labels */}
            <text x={ox + axisW + 8} y={oy + 5} fill={color} fontSize={16}
              fontFamily="'Caveat', cursive" fontWeight={700}
              style={{ opacity: 0, animation: `chalk-fade 0.5s ease-out calc(${delay} + 1s) forwards` }}
            >{xLabel}</text>
            <text x={ox - 5} y={oy - axisH - 8} fill={color} fontSize={16}
              fontFamily="'Caveat', cursive" fontWeight={700} textAnchor="middle"
              style={{ opacity: 0, animation: `chalk-fade 0.5s ease-out calc(${delay} + 1s) forwards` }}
            >{yLabel}</text>
          </g>
        );
      }

      case "point": {
        // Parse "x,y label"
        const parts = el.content.match(/([\d.]+),([\d.]+)\s*(.*)/);
        let px: number, py: number, label = "";
        if (parts) {
          px = Number(parts[1]); py = Number(parts[2]);
          label = parts[3] || "";
        } else {
          px = svgW / 2; py = getAutoY(index);
          label = el.content.replace(/^[\d.,\s]+/, "").trim() || el.content;
        }
        return (
          <g key={index}>
            <circle
              cx={px} cy={py} r={5}
              fill={color} stroke={color} strokeWidth={1}
              style={fadeAnim}
            />
            {label && (
              <text
                x={px + 10} y={py + 5}
                fill={color} fontSize={fontSize - 4}
                fontFamily="'Caveat', cursive" fontWeight={700}
                style={{ opacity: 0, animation: `chalk-fade 0.5s ease-out calc(${delay} + 0.3s) forwards` }}
              >
                {label}
              </text>
            )}
          </g>
        );
      }

      default:
        return null;
    }
  };

  const hasContent = activeData && activeData.elements.length > 0;
  const contentBottomY = activeData && activeData.elements.length > 0 ? Math.max(
    ...activeData.elements.map((el, i) => {
      if (el.kind === "text") return getAutoY(i) + 20;
      return getAutoY(i) + 30;
    }),
    120
  ) : SVG_H;
  const dynamicSvgH = isMobile ? svgH : Math.max(contentBottomY + 40, 200);

  return (
    <div className={`relative ${className}`} style={{ width: "100%", height: isMobile ? undefined : "100%" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap');
        @keyframes chalk-stroke {
          to { stroke-dashoffset: 0; }
        }
        @keyframes chalk-fade {
          to { opacity: 1; }
        }
      `}</style>

      <div
        style={{
          backgroundColor: "#1E2D3A",
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
        <button
          onClick={handleErase}
          disabled={!hasContent}
          className="absolute top-2 right-2 z-10 text-xs px-2.5 py-1 rounded bg-[#F5F0E8]/15 text-[#F5F0E8] hover:bg-[#F5F0E8]/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Erase whiteboard"
        >
          🧽 Erase
        </button>

        {activeData?.title && (
          <div
            className="mb-1"
            style={{
              fontFamily: "'Caveat', cursive",
              fontSize: 24,
              color: "#F5F0E8",
              opacity: phase === "fading-out" ? 0 : 1,
              transition: "opacity 0.3s ease",
            }}
          >
            {activeData.title}
          </div>
        )}

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
                  const y = getAutoY(i);
                  const fs = el.size === "large" ? 34 : el.size === "small" ? 22 : 28;
                  return (
                    <text
                      key={`sel-${i}`}
                      x={pad} y={y} fontSize={fs}
                      fontFamily="'Caveat', cursive" fontWeight={700}
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

        <div
          className={`absolute z-10 ${activeElementIndex >= 0 ? "mr-white-floating" : "mr-white-idle-float"}`}
          style={{
            transition: "top 0.8s ease-in-out, left 0.8s ease-in-out, bottom 0.8s ease-in-out, right 0.8s ease-in-out",
            ...mrWhitePosition,
          }}
        >
          <MrWhite
            state={activeElementIndex >= 0 ? "drawing" : mrWhiteState}
            size={mrWhiteSize}
          />
        </div>

        {!hasContent && phase === "idle" && (
          <div
            className="flex items-center justify-center text-2xl lg:text-3xl"
            style={{
              fontFamily: "'Caveat', cursive",
              color: "#F5F0E8",
              opacity: 0.4,
              position: "absolute",
              top: "45%",
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
