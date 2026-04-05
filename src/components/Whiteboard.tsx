import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import MrWhite, { type MrWhiteState } from "./MrWhite";
import HighlightAskTooltip from "./HighlightAskTooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { resolveLayout } from "@/lib/resolveWhiteboardLayout";
import { renderScene, type Scene } from "@/lib/SceneRenderer";

export interface WhiteboardElement {
  kind: "text" | "line" | "curve" | "circle" | "rect" | "axis" | "point" | "arrow" | "path";
  content: string;
  color: "blue" | "white" | "red" | "green" | "yellow";
  size?: "small" | "medium" | "large";
  delay_seconds: number;
}

export interface WhiteboardData {
  title?: string;
  elements?: WhiteboardElement[];
  template?: string;
  layout?: string;
  labels?: string[];
  colors?: string[];
  /** Structured scene description — rendered by SceneRenderer into precise elements. */
  scene?: Scene;
}

interface WhiteboardProps {
  whiteboardData: WhiteboardData | null;
  mrWhiteState?: MrWhiteState;
  className?: string;
  onAskAbout?: (text: string) => void;
  /** When provided, elements only animate when their index appears in this set.
   *  The parent (Ask.tsx) drives this via the TimelineEngine. */
  triggeredElements?: Set<number>;
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

export function buildElementsFromTemplate(template: string, labels: string[]): WhiteboardElement[] {
  switch (template.toUpperCase()) {
    case 'GRAPH':
      return [
        { kind: 'axis', content: 'x,y', color: 'white', delay_seconds: 0.0 },
        { kind: 'curve', content: 'M80,320 C200,280 350,160 580,80', color: 'blue', delay_seconds: 0.8 },
        { kind: 'point', content: '320,195 point', color: 'red', delay_seconds: 1.8 },
        { kind: 'line', content: '200,255 to 440,135 arrow', color: 'yellow', delay_seconds: 2.2 },
        { kind: 'text', content: labels[0] || 'f(x)', color: 'blue', delay_seconds: 2.8 },
        { kind: 'text', content: labels[1] || 'slope', color: 'yellow', delay_seconds: 3.2 },
      ];

    case 'FORCE_DIAGRAM':
      return [
        { kind: 'rect', content: '220,160 200 80 ' + (labels[0] || 'Object'), color: 'white', delay_seconds: 0.0 },
        { kind: 'arrow', content: '320,160 to 320,60 ' + (labels[1] || 'Normal'), color: 'blue', delay_seconds: 0.5 },
        { kind: 'arrow', content: '320,240 to 320,340 ' + (labels[2] || 'Gravity'), color: 'red', delay_seconds: 1.0 },
        { kind: 'arrow', content: '420,200 to 540,200 ' + (labels[3] || 'Force'), color: 'yellow', delay_seconds: 1.5 },
        { kind: 'text', content: 'F = ma', color: 'white', delay_seconds: 2.0 },
      ];

    case 'MOLECULE': {
      const elements: WhiteboardElement[] = [];
      const spacing = 480 / (labels.length + 1);
      labels.forEach((label, i) => {
        const cx = 80 + spacing * (i + 1);
        elements.push({
          kind: 'circle',
          content: `${cx},200 40 ${label}`,
          color: i === 0 ? 'blue' : i === labels.length - 1 ? 'red' : 'white',
          delay_seconds: i * 0.5,
        });
        if (i < labels.length - 1) {
          const nextCx = 80 + spacing * (i + 2);
          elements.push({
            kind: 'line',
            content: `${cx + 40},200 to ${nextCx - 40},200`,
            color: 'white',
            delay_seconds: i * 0.5 + 0.3,
          });
        }
      });
      return elements;
    }

    case 'PROCESS_FLOW': {
      const elements: WhiteboardElement[] = [];
      labels.forEach((label, i) => {
        const x = 40 + (520 / (labels.length + 1)) * (i + 1) - 60;
        elements.push({ kind: 'rect', content: `${x},165 120 70 ${label}`, color: 'blue', delay_seconds: i * 0.6 });
        if (i < labels.length - 1) {
          const nextX = 40 + (520 / (labels.length + 1)) * (i + 2) - 60;
          elements.push({ kind: 'arrow', content: `${x + 120},200 to ${nextX},200`, color: 'white', delay_seconds: i * 0.6 + 0.4 });
        }
      });
      return elements;
    }

    case 'EQUATION_BUILD': {
      const elements: WhiteboardElement[] = [];
      labels.forEach((term, i) => {
        elements.push({ kind: 'text', content: term, color: i % 2 === 0 ? 'blue' : 'white', delay_seconds: i * 0.35 });
      });
      return elements;
    }

    case 'COMPARISON': {
      const elements: WhiteboardElement[] = [
        { kind: 'line', content: '320,40 to 320,380', color: 'white', delay_seconds: 0.0 },
        { kind: 'line', content: '40,80 to 600,80', color: 'white', delay_seconds: 0.2 },
        { kind: 'text', content: labels[0] || 'A', color: 'blue', delay_seconds: 0.5 },
        { kind: 'text', content: labels[1] || 'B', color: 'red', delay_seconds: 0.7 },
      ];
      for (let i = 2; i < labels.length; i++) {
        const row = Math.floor((i - 2) / 2);
        const isLeft = (i - 2) % 2 === 0;
        elements.push({
          kind: 'text',
          content: labels[i],
          color: isLeft ? 'blue' : 'red',
          delay_seconds: 0.8 + row * 0.4 + (isLeft ? 0 : 0.2),
        });
      }
      return elements;
    }

    default:
      return [];
  }
}

const Whiteboard: React.FC<WhiteboardProps> = ({
  whiteboardData,
  mrWhiteState = "idle",
  className = "",
  onAskAbout,
  triggeredElements,
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
  const mrWhiteSize = isMobile ? 120 : 192;

  useEffect(() => {
    if (whiteboardData === prevDataRef.current) return;

    // Scene path — structured scene object rendered to precise elements
    if (whiteboardData?.scene) {
      const elements = renderScene(whiteboardData.scene);
      if (elements.length > 0) {
        prevDataRef.current = whiteboardData;
        setActiveData({ title: whiteboardData.title || whiteboardData.scene.title || "", elements });
        setDrawKey(k => k + 1);
        setPhase("drawing");
        return;
      }
    }

    if (whiteboardData?.template && (!whiteboardData.elements || whiteboardData.elements.length === 0)) {
      const elements = buildElementsFromTemplate(whiteboardData.template, whiteboardData.labels || []);
      if (elements.length > 0) {
        prevDataRef.current = whiteboardData;
        setActiveData({ title: whiteboardData.title || '', elements });
        setDrawKey(k => k + 1);
        setPhase('drawing');
        return;
      }
    }

    prevDataRef.current = whiteboardData;

    if (!whiteboardData) {
      setPhase("idle");
      setActiveData(null);
      setActiveElementIndex(-1);
      return;
    }

    // Resolve layout-based data into elements, or use elements directly
    let resolvedElements: WhiteboardElement[] = [];
    if (whiteboardData.layout) {
      resolvedElements = resolveLayout(
        whiteboardData.layout,
        whiteboardData.labels || [],
        whiteboardData.colors || [],
      );
    } else if (whiteboardData.elements) {
      resolvedElements = whiteboardData.elements;
    }

    if (resolvedElements.length === 0) {
      setPhase("idle");
      setActiveData(null);
      setActiveElementIndex(-1);
      return;
    }

    const resolved: WhiteboardData = {
      title: whiteboardData.title,
      elements: resolvedElements,
    };

    if (activeData && activeData.elements && activeData.elements.length > 0) {
      setPhase("fading-out");
      const t = setTimeout(() => {
        setActiveData(resolved);
        setDrawKey((k) => k + 1);
        setPhase("drawing");
      }, 300);
      return () => clearTimeout(t);
    } else {
      setActiveData(resolved);
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

  // ─── NAMED LAYOUTS SYSTEM ───
  // resolveLayout takes a layout name, labels, and colors and returns
  // a fully calculated WhiteboardElement[] with precise coordinates.
  const resolveLayout = (
    layoutName: string,
    labels: string[],
    colors: string[],
  ): WhiteboardElement[] => {
    const c = (i: number): "blue" | "white" | "red" | "green" | "yellow" =>
      (colors[i] as any) || "white";

    switch (layoutName) {
      case "graph_single_curve": {
        // labels: [curveLabel, pointLabel, slopeLabel, xAxisLabel, yAxisLabel]
        const curveLabel = labels[0] || "f(x)";
        const pointLabel = labels[1] || "(x, f(x))";
        const slopeLabel = labels[2] || "slope";
        const xAxis = labels[3] || "x";
        const yAxis = labels[4] || "y";
        return [
          { kind: "axis", content: `${xAxis},${yAxis}`, color: c(0), delay_seconds: 0.0 },
          { kind: "curve", content: "M80,320 C180,280 300,180 560,100", color: c(1) || "blue", delay_seconds: 0.8 },
          { kind: "point", content: `300,180 ${pointLabel}`, color: c(2) || "yellow", delay_seconds: 1.8 },
          { kind: "line", content: "200,240 to 400,120 arrow", color: c(3) || "red", delay_seconds: 2.2 },
          { kind: "text", content: curveLabel, color: c(4) || "white", size: "medium", delay_seconds: 2.8 },
          { kind: "text", content: slopeLabel, color: c(5) || "yellow", size: "small", delay_seconds: 3.2 },
        ];
      }

      case "force_diagram": {
        // labels: [objectName, upForce, downForce, rightForce, equation]
        const obj = labels[0] || "Object";
        const up = labels[1] || "Normal Force";
        const down = labels[2] || "Gravity (mg)";
        const right = labels[3] || "Applied Force";
        const eq = labels[4] || "ΣF = ma";
        return [
          { kind: "rect", content: `220,160 200 80 ${obj}`, color: c(0) || "white", delay_seconds: 0.0 },
          { kind: "arrow", content: `320,160 to 320,60 ${up}`, color: c(1) || "blue", delay_seconds: 0.5 },
          { kind: "arrow", content: `320,240 to 320,340 ${down}`, color: c(2) || "red", delay_seconds: 1.0 },
          { kind: "arrow", content: `420,200 to 520,200 ${right}`, color: c(3) || "yellow", delay_seconds: 1.5 },
          { kind: "text", content: eq, color: c(4) || "white", size: "medium", delay_seconds: 2.0 },
        ];
      }

      case "molecule_horizontal": {
        // labels: [atom1, atom2, atom3, moleculeName]
        const a1 = labels[0] || "A";
        const a2 = labels[1] || "B";
        const a3 = labels[2] || "C";
        const name = labels[3] || "";
        return [
          { kind: "circle", content: `140,200 40 ${a1}`, color: c(0) || "blue", delay_seconds: 0.0 },
          { kind: "line", content: "180,200 to 280,200", color: c(1) || "white", delay_seconds: 0.5 },
          { kind: "circle", content: `320,200 40 ${a2}`, color: c(2) || "white", delay_seconds: 1.0 },
          { kind: "line", content: "360,200 to 460,200", color: c(3) || "white", delay_seconds: 1.5 },
          { kind: "circle", content: `500,200 40 ${a3}`, color: c(4) || "red", delay_seconds: 2.0 },
          ...(name
            ? [{ kind: "text" as const, content: name, color: c(5) || ("white" as const), size: "medium" as const, delay_seconds: 2.5 }]
            : []),
        ];
      }

      case "process_three_steps": {
        // labels: [step1, step2, step3, desc1, desc2, desc3]
        const s1 = labels[0] || "Step 1";
        const s2 = labels[1] || "Step 2";
        const s3 = labels[2] || "Step 3";
        const d1 = labels[3] || "";
        const d2 = labels[4] || "";
        const d3 = labels[5] || "";
        const rw = 150, rh = 80;
        return [
          { kind: "rect", content: `60,160 ${rw} ${rh} ${s1}`, color: c(0) || "blue", delay_seconds: 0.0 },
          { kind: "arrow", content: `${60 + rw},200 to 240,200`, color: c(1) || "white", delay_seconds: 0.5 },
          { kind: "rect", content: `240,160 ${rw} ${rh} ${s2}`, color: c(2) || "blue", delay_seconds: 0.8 },
          { kind: "arrow", content: `${240 + rw},200 to 420,200`, color: c(3) || "white", delay_seconds: 1.2 },
          { kind: "rect", content: `420,160 ${rw} ${rh} ${s3}`, color: c(4) || "blue", delay_seconds: 1.5 },
          ...(d1 ? [{ kind: "text" as const, content: d1, color: c(5) || ("white" as const), size: "small" as const, delay_seconds: 2.0 }] : []),
          ...(d2 ? [{ kind: "text" as const, content: d2, color: c(5) || ("white" as const), size: "small" as const, delay_seconds: 2.4 }] : []),
          ...(d3 ? [{ kind: "text" as const, content: d3, color: c(5) || ("white" as const), size: "small" as const, delay_seconds: 2.8 }] : []),
        ];
      }

      case "comparison_two_col": {
        // labels: [leftHeader, rightHeader, ...leftItems, ...rightItems]
        // Convention: first 2 are headers, then alternating left/right items
        const lHead = labels[0] || "Column A";
        const rHead = labels[1] || "Column B";
        const items = labels.slice(2);
        const leftItems: string[] = [];
        const rightItems: string[] = [];
        for (let i = 0; i < items.length; i++) {
          if (i % 2 === 0) leftItems.push(items[i]);
          else rightItems.push(items[i]);
        }
        const elements: WhiteboardElement[] = [
          { kind: "line", content: "320,40 to 320,380", color: c(0) || "white", delay_seconds: 0.0 },
          { kind: "line", content: "40,80 to 600,80", color: c(1) || "white", delay_seconds: 0.3 },
          { kind: "text", content: lHead, color: c(2) || "blue", size: "medium", delay_seconds: 0.6 },
          { kind: "text", content: rHead, color: c(3) || "blue", size: "medium", delay_seconds: 0.8 },
        ];
        leftItems.forEach((item, i) => {
          elements.push({
            kind: "text", content: item, color: c(4) || "white", size: "small",
            delay_seconds: 1.0 + i * 0.4,
          });
        });
        rightItems.forEach((item, i) => {
          elements.push({
            kind: "text", content: item, color: c(5) || "white", size: "small",
            delay_seconds: 1.4 + i * 0.4,
          });
        });
        return elements;
      }

      case "equation_buildup": {
        // labels: each label is a term; last label is the full result
        const terms = labels.length > 0 ? labels : ["a", "+", "b", "=", "c"];
        const totalWidth = terms.length * 50;
        const startX = Math.max(80, (640 - totalWidth) / 2);
        const elements: WhiteboardElement[] = terms.map((term, i) => ({
          kind: "text" as const,
          content: term,
          color: c(i) || ("white" as const),
          size: "large" as const,
          delay_seconds: i * 0.3,
        }));
        // Box around the final result (last term)
        const lastIdx = terms.length - 1;
        const boxX = startX + lastIdx * 50 - 10;
        elements.push({
          kind: "rect",
          content: `${boxX},175 ${terms[lastIdx].length * 20 + 20} 50`,
          color: c(lastIdx) || "yellow",
          delay_seconds: lastIdx * 0.3 + 0.3,
        });
        return elements;
      }

      default:
        return [];
    }
  };

  // Export resolveLayout on the component for external access
  (Whiteboard as any).resolveLayout = resolveLayout;

  const renderElement = (el: WhiteboardElement, index: number) => {
    // When timeline-controlled, skip untriggered elements entirely so they
    // remain invisible until the audio reaches their timestamp.
    if (triggeredElements !== undefined && !triggeredElements.has(index)) {
      return null;
    }

    const color = CHALK_COLORS[el.color] || CHALK_COLORS.blue;
    // When timeline-controlled the timing is driven externally — animate immediately.
    const delay = triggeredElements !== undefined ? "0s" : `${el.delay_seconds ?? index * 0.4}s`;
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
        // SceneRenderer prefixes text with "x,y content" for precise placement.
        // Legacy text (plain labels) falls back to auto-layout.
        const coordMatch = el.content.match(/^(\d+),(\d+)\s+([\s\S]+)/);
        const textX       = coordMatch ? Number(coordMatch[1]) : 60;
        const textY       = coordMatch ? Number(coordMatch[2]) : getAutoY(index);
        const textContent = coordMatch ? coordMatch[3] : el.content;
        return (
          <text
            key={index}
            x={textX}
            y={textY}
            fill={color}
            fontSize={fontSize}
            fontFamily="'Caveat', cursive"
            fontWeight={700}
            style={fadeAnim}
          >
            {textContent}
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
