import React, { useEffect, useState, useRef, useCallback } from "react";
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
  blue: "#3B6FCA",
  white: "#5A5A50",
  red: "#E05252",
  green: "#4CAF50",
  yellow: "#D4A017",
};

const SVG_W = 640;
const SVG_H = 400;
const PAD = 28;

// Unique ID counter for clip paths
let clipIdCounter = 0;

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

  const svgW = isMobile ? 380 : SVG_W;
  const svgH = isMobile ? 300 : SVG_H;
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

  // Auto-layout: compute Y positions for elements that don't specify coordinates
  const getAutoY = (index: number) => (isMobile ? 44 : 56) + index * (isMobile ? 42 : 50);

  const renderElement = (el: WhiteboardElement, index: number) => {
    const color = CHALK_COLORS[el.color] || CHALK_COLORS.blue;
    const delay = `${el.delay_seconds ?? index * 0.4}s`;
    const fontSize = el.size === "large" ? 28 : el.size === "small" ? 18 : 22;

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
          label = el.content;
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
          label = el.content;
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
          label = el.content;
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
  const dynamicSvgH = isMobile ? svgH : Math.max(SVG_H, (activeData?.elements.length || 0) * 50 + 80);

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
        <button
          onClick={handleErase}
          disabled={!hasContent}
          className="absolute top-2 right-2 z-10 text-xs px-2.5 py-1 rounded bg-[#8B6914]/20 text-[#8B6914] hover:bg-[#8B6914]/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Erase whiteboard"
        >
          🧽 Erase
        </button>

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
                  const fs = el.size === "large" ? 28 : el.size === "small" ? 18 : 22;
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
          className="absolute transition-all duration-700 ease-in-out z-10"
          style={{
            bottom: isMobile ? 4 : 8,
            right: isMobile ? 8 : 16,
            ...(phase === "drawing" && hasContent ? { transform: "translateX(-10px)" } : {}),
          }}
        >
          <MrWhite state={mrWhiteState} size={isMobile ? 80 : 120} />
        </div>

        {!hasContent && phase === "idle" && (
          <div
            className="flex items-center justify-center text-2xl lg:text-3xl"
            style={{
              fontFamily: "'Caveat', cursive",
              color: "#8B6914",
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
