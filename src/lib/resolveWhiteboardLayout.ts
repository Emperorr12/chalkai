import type { WhiteboardElement, WhiteboardData } from "@/components/Whiteboard";

/**
 * Resolves a named layout + labels into a fully calculated WhiteboardElement array.
 * This is the shared version used by all pages to convert AI responses into renderable elements.
 */
export function resolveLayout(
  layoutName: string,
  labels: string[],
  colors: string[],
): WhiteboardElement[] {
  const c = (i: number): "blue" | "white" | "red" | "green" | "yellow" =>
    (colors[i] as any) || "white";

  switch (layoutName) {
    case "graph_single_curve": {
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
        elements.push({ kind: "text", content: item, color: c(4) || "white", size: "small", delay_seconds: 1.0 + i * 0.4 });
      });
      rightItems.forEach((item, i) => {
        elements.push({ kind: "text", content: item, color: c(5) || "white", size: "small", delay_seconds: 1.4 + i * 0.4 });
      });
      return elements;
    }

    case "equation_buildup": {
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
}

/**
 * Converts an AI whiteboard response (layout-based or legacy elements-based) into WhiteboardData.
 * Handles both the new layout system and legacy raw elements for backward compatibility.
 */
export function resolveWhiteboardData(
  wb: {
    active?: boolean;
    layout?: string;
    title?: string;
    labels?: string[];
    colors?: string[];
    elements?: WhiteboardElement[];
  } | null | undefined,
): WhiteboardData | null {
  if (!wb?.active) return null;

  // New layout-based system
  if (wb.layout) {
    const elements = resolveLayout(wb.layout, wb.labels || [], wb.colors || []);
    if (elements.length > 0) {
      return { title: wb.title || "", elements };
    }
  }

  // Legacy fallback: raw elements array
  if (wb.elements && wb.elements.length > 0) {
    return { title: wb.title || "", elements: wb.elements };
  }

  return null;
}
