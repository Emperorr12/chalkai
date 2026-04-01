import React, { useEffect, useState, useRef } from "react";

export interface WhiteboardElement {
  kind: "text" | "line" | "arrow" | "circle" | "rect" | "curve";
  content: string;
  color: "blue" | "white" | "red";
  size: "small" | "medium" | "large";
  delay_seconds: number;
}

interface WhiteboardProps {
  title?: string;
  elements: WhiteboardElement[];
  isActive: boolean;
  compact?: boolean;
  onClear?: () => void;
  className?: string;
}

const colorMap = {
  blue: "#3B6FCA",
  white: "#1A1A1A",
  red: "#E05252",
};

const sizeMap = {
  small: { fontSize: 18, shapeScale: 0.7 },
  medium: { fontSize: 24, shapeScale: 1 },
  large: { fontSize: 32, shapeScale: 1.3 },
};

const Whiteboard: React.FC<WhiteboardProps> = ({
  title,
  elements,
  isActive,
  compact = false,
  onClear,
  className = "",
}) => {
  const [visibleCount, setVisibleCount] = useState(0);
  const [isClearing, setIsClearing] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive || elements.length === 0) {
      setVisibleCount(0);
      return;
    }
    setVisibleCount(0);
    let count = 0;
    const showNext = () => {
      count++;
      setVisibleCount(count);
      if (count < elements.length) {
        const nextDelay = (elements[count]?.delay_seconds || 0.4) * 1000;
        timerRef.current = window.setTimeout(showNext, Math.max(nextDelay, 200));
      }
    };
    const firstDelay = (elements[0]?.delay_seconds || 0) * 1000;
    timerRef.current = window.setTimeout(showNext, Math.max(firstDelay, 100));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isActive, elements]);

  const handleClear = () => {
    setIsClearing(true);
    setTimeout(() => {
      setVisibleCount(0);
      setIsClearing(false);
      onClear?.();
    }, 400);
  };

  const w = compact ? 320 : 680;
  const h = compact ? 240 : 400;

  const renderElement = (el: WhiteboardElement, index: number) => {
    const color = colorMap[el.color] || colorMap.blue;
    const size = sizeMap[el.size] || sizeMap.medium;
    const yOffset = 50 + index * 55;

    switch (el.kind) {
      case "text":
        return (
          <text
            key={index}
            x="30"
            y={yOffset}
            fill={color}
            fontSize={size.fontSize}
            fontFamily="Caveat, cursive"
            opacity={index < visibleCount ? 1 : 0}
            style={{ transition: "opacity 0.5s ease-out" }}
          >
            {el.content}
          </text>
        );
      case "line":
        return (
          <line
            key={index}
            x1="30"
            y1={yOffset}
            x2={w - 60}
            y2={yOffset}
            stroke={color}
            strokeWidth={2.5 * size.shapeScale}
            strokeLinecap="round"
            strokeDasharray={w - 90}
            strokeDashoffset={index < visibleCount ? 0 : w - 90}
            style={{ transition: "stroke-dashoffset 1s ease-out" }}
          />
        );
      case "arrow":
        return (
          <g
            key={index}
            opacity={index < visibleCount ? 1 : 0}
            style={{ transition: "opacity 0.5s ease-out" }}
          >
            <line
              x1="30"
              y1={yOffset}
              x2={w * 0.6}
              y2={yOffset}
              stroke={color}
              strokeWidth={2.5 * size.shapeScale}
              strokeLinecap="round"
            />
            <polygon
              points={`${w * 0.6},${yOffset - 6} ${w * 0.6 + 12},${yOffset} ${w * 0.6},${yOffset + 6}`}
              fill={color}
            />
          </g>
        );
      case "circle":
        return (
          <circle
            key={index}
            cx={w / 2}
            cy={yOffset}
            r={25 * size.shapeScale}
            stroke={color}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={160 * size.shapeScale}
            strokeDashoffset={index < visibleCount ? 0 : 160 * size.shapeScale}
            style={{ transition: "stroke-dashoffset 1s ease-out" }}
          />
        );
      case "rect":
        return (
          <rect
            key={index}
            x={30}
            y={yOffset - 20}
            width={100 * size.shapeScale}
            height={40 * size.shapeScale}
            stroke={color}
            strokeWidth={2.5}
            fill="none"
            rx="4"
            strokeLinecap="round"
            strokeDasharray={280 * size.shapeScale}
            strokeDashoffset={index < visibleCount ? 0 : 280 * size.shapeScale}
            style={{ transition: "stroke-dashoffset 1s ease-out" }}
          />
        );
      case "curve":
        return (
          <path
            key={index}
            d={`M30 ${yOffset} Q${w / 3} ${yOffset - 40 * size.shapeScale} ${w / 2} ${yOffset} Q${w * 2 / 3} ${yOffset + 40 * size.shapeScale} ${w - 60} ${yOffset}`}
            stroke={color}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={w}
            strokeDashoffset={index < visibleCount ? 0 : w}
            style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`whiteboard-surface ${className}`}
      style={{
        maxWidth: compact ? 320 : 680,
        width: "100%",
        opacity: isClearing ? 0 : 1,
        transition: "opacity 0.4s ease",
      }}
    >
      {/* Chalk tray decoration */}
      <div className="absolute top-2 right-2 flex gap-1">
        <div className="w-4 h-1.5 rounded-full bg-primary opacity-80" />
        <div className="w-4 h-1.5 rounded-full opacity-80" style={{ backgroundColor: "#E05252" }} />
        <div className="w-4 h-1.5 rounded-full bg-foreground opacity-30" />
      </div>

      {/* Top controls */}
      <div className="absolute top-2 left-2 flex gap-2">
        {onClear && (
          <button
            onClick={handleClear}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5 rounded"
            aria-label="Erase whiteboard"
          >
            ✕ Erase
          </button>
        )}
      </div>

      {/* Title */}
      {title && (
        <div className="font-chalk text-xl text-foreground pt-6 pb-1 px-6 opacity-80">
          {title}
        </div>
      )}

      {/* Drawing area */}
      <div className="p-6 pt-2">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          width="100%"
          height="auto"
          style={{ minHeight: compact ? 180 : 280 }}
        >
          {elements.map((el, i) => renderElement(el, i))}
        </svg>
      </div>
    </div>
  );
};

export default Whiteboard;
