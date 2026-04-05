import type { WhiteboardElement } from "@/components/Whiteboard";

// ─── Scene content types ─────────────────────────────────────────────────────

export interface ComparisonTableContent {
  left_header: string;
  right_header: string;
  left_items: string[];
  right_items: string[];
}

export interface StepSequenceContent {
  steps: string[];
  descriptions?: string[];
}

export interface LabeledDiagramContent {
  shape: "triangle" | "circle" | "rectangle" | "arrow_chain";
  labels?: Record<string, string>;
  measurements?: Record<string, string>;
}

export interface GraphSketchContent {
  x_label?: string;
  y_label?: string;
  curve_type?: "linear" | "exponential" | "parabola" | "sine";
  key_points?: Array<{ x: number; y: number; label?: string }>;
  annotations?: Array<{ x: number; y: number; text: string }>;
}

export interface EquationContent {
  terms: string[];
  name?: string;
  annotation?: string;
}

export interface TextOnlyContent {
  lines: string[];
}

// Discriminated union — type field drives narrowing in renderScene switch
export type Scene =
  | { type: "comparison_table"; title?: string; content: ComparisonTableContent }
  | { type: "step_sequence";    title?: string; content: StepSequenceContent }
  | { type: "labeled_diagram";  title?: string; content: LabeledDiagramContent }
  | { type: "graph_sketch";     title?: string; content: GraphSketchContent }
  | { type: "equation";         title?: string; content: EquationContent }
  | { type: "text_only";        title?: string; content: TextOnlyContent };

// ─── Timing helper ────────────────────────────────────────────────────────────
// Spreads elements evenly from 0 → 5 seconds so the board always builds
// progressively at the same pace as Mr. White speaks.

type PreElement = Omit<WhiteboardElement, "delay_seconds">;

function applyTimings(elements: PreElement[]): WhiteboardElement[] {
  const n = elements.length;
  return elements.map((el, i) => ({
    ...el,
    delay_seconds: n <= 1 ? 0 : parseFloat((i * (5.0 / (n - 1))).toFixed(2)),
  }));
}

// ─── Renderer: comparison_table ──────────────────────────────────────────────
// Two-column comparison with a vertical divider and a header row.
// Left column blue, right column yellow. Items interleaved for pacing.

function renderComparisonTable(rawContent: ComparisonTableContent): WhiteboardElement[] {
  // Normalize flat labels[] sent by edge function:
  // [leftHeader, rightHeader, leftItem0, rightItem0, leftItem1, rightItem1, ...]
  const flat = (rawContent as ComparisonTableContent & { labels?: string[] }).labels;
  const content: ComparisonTableContent = Array.isArray(flat) && flat.length >= 2
    ? {
        left_header:  flat[0] ?? "",
        right_header: flat[1] ?? "",
        left_items:   flat.filter((_, i) => i >= 2 && i % 2 === 0),
        right_items:  flat.filter((_, i) => i > 2 && i % 2 !== 0),
      }
    : rawContent;
    console.log('COMPARISON DATA:', JSON.stringify(content));

  const els: PreElement[] = [];

  // Structural lines first
  els.push({ kind: "line", content: "320,40 to 320,370",  color: "white" });
  els.push({ kind: "line", content: "40,80 to 600,80",    color: "white" });

  // Column headers
  els.push({ kind: "text", content: `160,55 ${content.left_header}`,  color: "blue" });
  els.push({ kind: "text", content: `430,55 ${content.right_header}`, color: "yellow" });

  // Body rows — interleave left and right so both columns grow together
  const maxRows = Math.max(content.left_items.length, content.right_items.length);
  for (let i = 0; i < maxRows; i++) {
    const y = 115 + i * 60;
    if (content.left_items[i]) {
      els.push({ kind: "text", content: `100,${y} ${content.left_items[i]}`,  color: "white" });
    }
    if (content.right_items[i]) {
      els.push({ kind: "text", content: `370,${y} ${content.right_items[i]}`, color: "yellow" });
    }
  }

  return applyTimings(els);
}

// ─── Renderer: step_sequence ─────────────────────────────────────────────────
// N boxes evenly spaced across the canvas with connecting arrows.

function renderStepSequence(content: StepSequenceContent): WhiteboardElement[] {
  const els: PreElement[] = [];
  const n = content.steps.length;
  const BOX_W = 120, BOX_H = 60, BOX_Y = 160;
  const AVAILABLE = 560; // canvas x 40 → 600

  content.steps.forEach((step, i) => {
    const cx  = Math.round(40 + (AVAILABLE / (n + 1)) * (i + 1));
    const bx  = cx - BOX_W / 2;
    const mid = BOX_Y + BOX_H / 2;

    els.push({ kind: "rect", content: `${bx},${BOX_Y} ${BOX_W} ${BOX_H} ${step}`, color: "blue" });

    // Arrow to next box
    if (i < n - 1) {
      const nextCx = Math.round(40 + (AVAILABLE / (n + 1)) * (i + 2));
      const nextBx = nextCx - BOX_W / 2;
      els.push({
        kind: "arrow",
        content: `${bx + BOX_W},${mid} to ${nextBx},${mid}`,
        color: "white",
      });
    }

    // Optional description below the box
    if (content.descriptions?.[i]) {
      els.push({
        kind: "text",
        content: `${bx},${BOX_Y + BOX_H + 20} ${content.descriptions[i]}`,
        color: "white",
      });
    }
  });

  return applyTimings(els);
}

// ─── Renderer: labeled_diagram ───────────────────────────────────────────────

function renderLabeledDiagram(content: LabeledDiagramContent): WhiteboardElement[] {
  const els: PreElement[] = [];
  const labels = content.labels ?? {};
  const meas   = content.measurements ?? {};

  if (content.shape === "triangle") {
    // Vertices: top-center, bottom-left, bottom-right
    const [tx, ty]   = [320, 60];
    const [blx, bly] = [140, 340];
    const [brx, bry] = [500, 340];

    els.push({ kind: "line", content: `${blx},${bly} to ${brx},${bry}`, color: "white" });
    els.push({ kind: "line", content: `${blx},${bly} to ${tx},${ty}`,   color: "white" });
    els.push({ kind: "line", content: `${tx},${ty} to ${brx},${bry}`,   color: "blue"  });

    if (labels.top)   els.push({ kind: "text", content: `${tx - 12},${ty - 16} ${labels.top}`,   color: "yellow" });
    if (labels.left)  els.push({ kind: "text", content: `${blx - 36},${bly + 24} ${labels.left}`, color: "white"  });
    if (labels.right) els.push({ kind: "text", content: `${brx + 8},${bry + 24} ${labels.right}`,  color: "white"  });

    // Side measurements at midpoints
    if (meas.base)  els.push({ kind: "text", content: `${Math.round((blx + brx) / 2 - 12)},${bly + 28} ${meas.base}`,                      color: "yellow" });
    if (meas.left)  els.push({ kind: "text", content: `${Math.round((blx + tx) / 2) - 44},${Math.round((bly + ty) / 2)} ${meas.left}`,       color: "yellow" });
    if (meas.right) els.push({ kind: "text", content: `${Math.round((brx + tx) / 2) + 8},${Math.round((bry + ty) / 2)} ${meas.right}`,       color: "yellow" });

  } else if (content.shape === "circle") {
    els.push({ kind: "circle", content: "320,200 100",                                         color: "blue"   });
    if (labels.center) els.push({ kind: "text", content: `290,208 ${labels.center}`, color: "white"  });
    if (labels.top)    els.push({ kind: "text", content: `300,86 ${labels.top}`,     color: "yellow" });
    if (labels.right)  els.push({ kind: "text", content: `432,208 ${labels.right}`,  color: "yellow" });

  } else if (content.shape === "rectangle") {
    els.push({ kind: "rect", content: "160,120 320 160 ",                                         color: "blue"   });
    if (labels.center) els.push({ kind: "text", content: `284,206 ${labels.center}`, color: "white"  });
    if (labels.top)    els.push({ kind: "text", content: `290,106 ${labels.top}`,    color: "yellow" });
    if (labels.left)   els.push({ kind: "text", content: `88,208 ${labels.left}`,    color: "yellow" });
    if (labels.right)  els.push({ kind: "text", content: `494,208 ${labels.right}`,  color: "yellow" });

  } else if (content.shape === "arrow_chain") {
    const items = Object.values(labels).slice(0, 4);
    const nc = items.length;
    items.forEach((item, i) => {
      const cx = Math.round(80 + (480 / (nc + 1)) * (i + 1));
      els.push({ kind: "circle", content: `${cx},200 40 ${item}`, color: i === 0 ? "blue" : "white" });
      if (i < nc - 1) {
        const nextCx = Math.round(80 + (480 / (nc + 1)) * (i + 2));
        els.push({ kind: "arrow", content: `${cx + 40},200 to ${nextCx - 40},200`, color: "yellow" });
      }
    });
  }

  return applyTimings(els);
}

// ─── Renderer: graph_sketch ──────────────────────────────────────────────────
// Fixed SVG canvas: origin x=80 y=320, safe area 60-600 / 30-380.
// Key-point coords are normalised [0,10] and mapped to SVG space.

const CURVE_PATHS: Record<string, string> = {
  linear:      "M80,320 L560,80",
  parabola:    "M80,320 Q320,40 560,320",
  exponential: "M80,320 C150,300 300,180 560,60",
  sine:        "M80,200 Q200,40 320,200 Q440,360 560,200",
};

function renderGraphSketch(content: GraphSketchContent): WhiteboardElement[] {
  const els: PreElement[] = [];

  els.push({
    kind: "axis",
    content: `${content.x_label ?? "x"},${content.y_label ?? "y"}`,
    color: "white",
  });

  const path = CURVE_PATHS[content.curve_type ?? "linear"] ?? CURVE_PATHS.linear;
  els.push({ kind: "path", content: path, color: "blue" });

  // Map normalised [0,10] → SVG coords (origin bottom-left at x=80, y=320)
  const toSvgX = (x: number) => Math.round(80 + (x / 10) * 480);
  const toSvgY = (y: number) => Math.round(320 - (y / 10) * 280);

  content.key_points?.forEach((pt) => {
    const sx = toSvgX(pt.x), sy = toSvgY(pt.y);
    els.push({ kind: "point", content: `${sx},${sy}${pt.label ? " " + pt.label : ""}`, color: "red" });
  });

  content.annotations?.forEach((ann) => {
    const sx = toSvgX(ann.x), sy = toSvgY(ann.y);
    els.push({ kind: "text", content: `${sx},${sy - 18} ${ann.text}`, color: "yellow" });
  });

  return applyTimings(els);
}

// ─── Renderer: equation ──────────────────────────────────────────────────────
// Terms spread horizontally, boxed, with optional name and annotation below.

function renderEquation(content: EquationContent): WhiteboardElement[] {
  const els: PreElement[] = [];
  const TERM_W  = 80;
  const totalW  = content.terms.length * TERM_W;
  const startX  = Math.max(40, Math.round((640 - totalW) / 2));

  // Box drawn first so it appears as the container
  els.push({ kind: "rect", content: `${startX - 10},155 ${totalW + 20} 60 `, color: "yellow" });

  content.terms.forEach((term, i) => {
    const tx = startX + i * TERM_W + Math.round(TERM_W / 2) - 10;
    els.push({ kind: "text", content: `${tx},197 ${term}`, color: i % 2 === 0 ? "blue" : "white" });
  });

  if (content.name) {
    const nx = Math.max(60, Math.round(320 - content.name.length * 7));
    els.push({ kind: "text", content: `${nx},268 ${content.name}`, color: "white" });
  }

  if (content.annotation) {
    const ax = Math.max(60, Math.round(320 - content.annotation.length * 6));
    els.push({ kind: "text", content: `${ax},308 ${content.annotation}`, color: "white" });
  }

  return applyTimings(els);
}

// ─── Renderer: text_only ─────────────────────────────────────────────────────
// Bulleted key points stacked vertically from the top of the board.

function renderTextOnly(content: TextOnlyContent): WhiteboardElement[] {
  const PAD_X = 60, START_Y = 80, GAP = 60;
  const els: PreElement[] = content.lines.map((line, i) => ({
    kind:    "text" as const,
    content: `${PAD_X},${START_Y + i * GAP} ${line}`,
    color:   (i === 0 ? "blue" : "white") as WhiteboardElement["color"],
  }));
  return applyTimings(els);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function renderScene(scene: Scene): WhiteboardElement[] {
  switch (scene.type) {
    case "comparison_table": return renderComparisonTable(scene.content);
    case "step_sequence":    return renderStepSequence(scene.content);
    case "labeled_diagram":  return renderLabeledDiagram(scene.content);
    case "graph_sketch":     return renderGraphSketch(scene.content);
    case "equation":         return renderEquation(scene.content);
    case "text_only":        return renderTextOnly(scene.content);
  }
}
