import React, { useState, useEffect, useCallback, useRef } from "react";
import { X } from "lucide-react";
import MrWhite from "./MrWhite";

interface HighlightAskTooltipProps {
  containerRef: React.RefObject<HTMLElement>;
  onAsk: (selectedText: string) => void;
}

const HighlightAskTooltip: React.FC<HighlightAskTooltipProps> = ({ containerRef, onAsk }) => {
  const [tooltip, setTooltip] = useState<{ text: string; top: number; left: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseUp = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) return;

      const range = sel.getRangeAt(0);
      const container = containerRef.current;
      if (!container) return;

      // Check selection is within a mr_white bubble
      const ancestor = range.commonAncestorContainer;
      const node = ancestor.nodeType === Node.TEXT_NODE ? ancestor.parentElement : ancestor as HTMLElement;
      if (!node) return;
      const bubble = node.closest?.("[data-mr-white-msg]");
      if (!bubble || !container.contains(bubble)) return;

      const text = sel.toString().trim();
      if (!text || text.length < 3) return;

      const rect = range.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      setTooltip({
        text,
        top: rect.top - containerRect.top - 40,
        left: rect.left - containerRect.left + rect.width / 2,
      });
    }, 200);
  }, [containerRef]);

  const dismiss = useCallback(() => setTooltip(null), []);

  const handleAsk = useCallback(() => {
    if (tooltip) {
      onAsk(tooltip.text);
      setTooltip(null);
      window.getSelection()?.removeAllRanges();
    }
  }, [tooltip, onAsk]);

  // Click outside to dismiss
  useEffect(() => {
    if (!tooltip) return;
    const handler = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setTooltip(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [tooltip]);

  // Listen for mouseup on the container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("mouseup", handleMouseUp);
    return () => el.removeEventListener("mouseup", handleMouseUp);
  }, [containerRef, handleMouseUp]);

  if (!tooltip) return null;

  return (
    <div
      ref={tooltipRef}
      className="absolute z-50 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-card border border-border shadow-lg cursor-pointer select-none animate-fade-in-up"
      style={{
        top: tooltip.top,
        left: tooltip.left,
        transform: "translateX(-50%)",
      }}
      onClick={handleAsk}
    >
      <MrWhite state="idle" size={20} className="flex-shrink-0" />
      <span className="text-xs font-medium text-foreground whitespace-nowrap">Ask Mr. White</span>
      <button
        onClick={(e) => { e.stopPropagation(); dismiss(); }}
        className="ml-1 p-0.5 rounded hover:bg-muted transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-3 h-3 text-muted-foreground" />
      </button>
    </div>
  );
};

export default HighlightAskTooltip;
