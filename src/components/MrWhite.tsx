import React from "react";

export type MrWhiteState = "idle" | "talking" | "thinking" | "excited" | "celebrating" | "drawing" | "listening";

interface MrWhiteProps {
  state?: MrWhiteState;
  size?: number;
  className?: string;
}

const MrWhite: React.FC<MrWhiteProps> = ({ state = "idle", size = 140, className = "" }) => {
  const getAnimationClass = () => {
    switch (state) {
      case "idle": return "animate-breathe";
      case "talking": return "animate-bounce-talk";
      case "thinking": return "animate-think";
      case "excited": return "animate-excited";
      case "celebrating": return "animate-celebrate";
      case "drawing": return "";
      case "listening": return "animate-lean";
      default: return "animate-breathe";
    }
  };

  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      <div className={getAnimationClass()} style={{ width: "100%", height: "100%" }}>
        <svg
          viewBox="0 0 140 140"
          width={size}
          height={size}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Mr. White, your chalk professor"
        >
          {/* Body / Jacket */}
          <path
            d="M45 95 C45 78, 55 72, 70 72 C85 72, 95 78, 95 95 L95 125 L45 125 Z"
            fill="#2C2C2C"
            stroke="#1A1A1A"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Jacket lapels */}
          <path
            d="M60 72 L65 88 L70 78"
            stroke="#444"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M80 72 L75 88 L70 78"
            stroke="#444"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Bowtie */}
          <path
            d="M63 74 L70 78 L77 74 L70 72 Z"
            fill="#3B6FCA"
            stroke="#2E5BA8"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Head */}
          <ellipse
            cx="70"
            cy="50"
            rx="22"
            ry="24"
            fill="#F5DEB3"
            stroke="#D4B896"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Hair */}
          <path
            d="M48 42 C48 28, 58 22, 70 22 C82 22, 92 28, 92 42"
            fill="#E8E8E8"
            stroke="#D0D0D0"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Hair tufts */}
          <path
            d="M50 38 C48 30, 55 24, 60 26"
            stroke="#D0D0D0"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M85 32 C88 26, 82 22, 78 24"
            stroke="#D0D0D0"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />

          {/* Glasses - left */}
          <circle cx="61" cy="48" r="8" stroke="#1A1A1A" strokeWidth="2" fill="none" />
          {/* Glasses - right */}
          <circle cx="79" cy="48" r="8" stroke="#1A1A1A" strokeWidth="2" fill="none" />
          {/* Glasses bridge */}
          <path d="M69 48 L71 48" stroke="#1A1A1A" strokeWidth="1.5" strokeLinecap="round" />
          {/* Glasses arms */}
          <path d="M53 46 L48 44" stroke="#1A1A1A" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M87 46 L92 44" stroke="#1A1A1A" strokeWidth="1.5" strokeLinecap="round" />

          {/* Eyes */}
          <circle cx="61" cy="47" r="2.5" fill="#1A1A1A" />
          <circle cx="79" cy="47" r="2.5" fill="#1A1A1A" />
          {/* Eye shine */}
          <circle cx="62" cy="46" r="0.8" fill="white" />
          <circle cx="80" cy="46" r="0.8" fill="white" />

          {/* Blink overlay */}
          <rect
            x="53"
            y="44"
            width="17"
            height="6"
            rx="3"
            fill="#F5DEB3"
            className="animate-blink"
          />
          <rect
            x="71"
            y="44"
            width="17"
            height="6"
            rx="3"
            fill="#F5DEB3"
            className="animate-blink"
          />

          {/* Nose */}
          <path
            d="M70 52 C68 54, 69 56, 71 55"
            stroke="#C4A882"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />

          {/* Mouth */}
          {state === "talking" ? (
            <ellipse cx="70" cy="60" rx="4" ry="3" fill="#1A1A1A" opacity="0.7" />
          ) : (
            <path
              d="M65 59 C67 62, 73 62, 75 59"
              stroke="#1A1A1A"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
          )}

          {/* Left arm */}
          <path
            d="M48 90 C40 85, 38 95, 42 100"
            stroke="#2C2C2C"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />

          {/* Right arm - extends toward whiteboard when drawing */}
          {state === "drawing" ? (
            <path
              d="M92 88 C100 80, 108 75, 112 72"
              stroke="#2C2C2C"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M92 90 C100 85, 102 90, 100 96"
              stroke="#2C2C2C"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
          )}

          {/* Chalk piece in right hand */}
          <rect
            x={state === "drawing" ? 110 : 97}
            y={state === "drawing" ? 69 : 93}
            width="8"
            height="4"
            rx="2"
            fill="white"
            stroke="#DDD"
            strokeWidth="1"
            transform={state === "drawing" ? "rotate(-30, 114, 71)" : "rotate(15, 101, 95)"}
          />

          {/* Thinking dots + text */}
          {state === "thinking" && (
            <>
              <circle cx="88" cy="28" r="2.5" fill="#3B6FCA" opacity="0.6" style={{ animation: "dots-pulse 1.2s 0s infinite" }} />
              <circle cx="95" cy="22" r="2.5" fill="#3B6FCA" opacity="0.6" style={{ animation: "dots-pulse 1.2s 0.2s infinite" }} />
              <circle cx="102" cy="28" r="2.5" fill="#3B6FCA" opacity="0.6" style={{ animation: "dots-pulse 1.2s 0.4s infinite" }} />
              <text x="95" y="16" textAnchor="middle" fontSize="10" fill="#3B6FCA" opacity="0.5" fontFamily="Caveat, cursive" style={{ animation: "dots-pulse 1.5s infinite" }}>...</text>
            </>
          )}

          {/* Listening sound waves */}
          {state === "listening" && (
            <>
              <circle cx="46" cy="48" r="6" stroke="#3B6FCA" strokeWidth="1.5" fill="none" opacity="0.5" style={{ animation: "sound-wave 1.5s 0s infinite" }} />
              <circle cx="46" cy="48" r="10" stroke="#3B6FCA" strokeWidth="1" fill="none" opacity="0.3" style={{ animation: "sound-wave 1.5s 0.3s infinite" }} />
            </>
          )}

          {/* Excited stars */}
          {state === "excited" && (
            <>
              <polygon points="100,30 102,35 107,35 103,38 105,43 100,40 95,43 97,38 93,35 98,35" fill="#3B6FCA" opacity="0.7" style={{ animation: "star-burst 0.6s ease-out forwards" }} />
              <polygon points="42,32 43,35 46,35 44,37 45,40 42,38 39,40 40,37 38,35 41,35" fill="#3B6FCA" opacity="0.5" style={{ animation: "star-burst 0.6s 0.15s ease-out forwards" }} />
              <polygon points="55,18 56,21 59,21 57,23 58,26 55,24 52,26 53,23 51,21 54,21" fill="#3B6FCA" opacity="0.6" style={{ animation: "star-burst 0.6s 0.08s ease-out forwards" }} />
              <polygon points="85,15 86,18 89,18 87,20 88,23 85,21 82,23 83,20 81,18 84,18" fill="#3B6FCA" opacity="0.4" style={{ animation: "star-burst 0.6s 0.22s ease-out forwards" }} />
            </>
          )}
        </svg>
      </div>

      {/* Celebrating confetti */}
      {state === "celebrating" && (
        <div className="absolute inset-0 pointer-events-none overflow-visible">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${20 + Math.random() * 60}%`,
                top: `-10%`,
                width: 6,
                height: 6,
                borderRadius: i % 2 === 0 ? "50%" : "1px",
                backgroundColor: i % 3 === 0 ? "#3B6FCA" : i % 3 === 1 ? "#E05252" : "#F5DEB3",
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MrWhite;
