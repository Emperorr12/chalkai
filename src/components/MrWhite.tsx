import React from "react";

export type MrWhiteState =
  | "idle"
  | "talking"
  | "thinking"
  | "excited"
  | "celebrating"
  | "drawing"
  | "listening";

interface MrWhiteProps {
  state?: MrWhiteState;
  size?: number;
  className?: string;
}

const MrWhite: React.FC<MrWhiteProps> = ({ state = "idle", size = 140, className = "" }) => {
  const animClass = (() => {
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
  })();

  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      <div className={animClass} style={{ width: "100%", height: "100%", transformOrigin: "center bottom" }}>
        <svg
          viewBox="0 0 140 140"
          width={size}
          height={size}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Mr. White, your chalk professor"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* ── Body / Academic Jacket ── */}
          <path
            d="M46 94 C46 79, 56 73, 70 73 C84 73, 94 79, 94 94 L96 126 L44 126 Z"
            fill="#2C2C2C"
            stroke="#1A1A1A"
            strokeWidth="2.2"
          />
          {/* Lapel lines */}
          <path d="M60 73 L66 89 L70 79" stroke="#444" strokeWidth="1.5" fill="none" />
          <path d="M80 73 L74 89 L70 79" stroke="#444" strokeWidth="1.5" fill="none" />

          {/* ── Bowtie (two triangles) ── */}
          <path d="M63 75 L70 79 L70 73 Z" fill="#3B6FCA" stroke="#2E5BA8" strokeWidth="1.2" />
          <path d="M77 75 L70 79 L70 73 Z" fill="#3B6FCA" stroke="#2E5BA8" strokeWidth="1.2" />

          {/* ── Head ── */}
          <ellipse
            cx="70"
            cy="50"
            rx="22"
            ry="24"
            fill="#F5DEB3"
            stroke="#D4B896"
            strokeWidth="2.2"
          />

          {/* ── Hair (light gray-white) ── */}
          <path
            d="M48 42 C48 27, 58 20, 70 20 C82 20, 92 27, 92 42"
            fill="#E8E8E8"
            stroke="#D0D0D0"
            strokeWidth="2"
          />
          {/* Hair tufts — slightly imperfect chalk strokes */}
          <path d="M50 38 C47 30, 55 23, 61 26" stroke="#D0D0D0" strokeWidth="2.3" fill="none" />
          <path d="M86 33 C89 26, 82 21, 77 24" stroke="#D0D0D0" strokeWidth="2" fill="none" />
          <path d="M70 20 C72 16, 76 17, 78 20" stroke="#DADADA" strokeWidth="1.8" fill="none" />

          {/* ── Glasses (wireframe, no fill) ── */}
          <circle cx="61" cy="48" r="8.5" stroke="#1A1A1A" strokeWidth="2" fill="none" />
          <circle cx="79" cy="48" r="8.5" stroke="#1A1A1A" strokeWidth="2" fill="none" />
          {/* Bridge */}
          <path d="M69.5 48 L70.5 48" stroke="#1A1A1A" strokeWidth="2" />
          {/* Arms of glasses */}
          <path d="M52.5 46 L47 43" stroke="#1A1A1A" strokeWidth="1.8" />
          <path d="M87.5 46 L93 43" stroke="#1A1A1A" strokeWidth="1.8" />

          {/* ── Eyes ── */}
          <circle cx="61" cy="47" r="2.5" fill="#1A1A1A" />
          <circle cx="79" cy="47" r="2.5" fill="#1A1A1A" />
          {/* Eye shine */}
          <circle cx="62.2" cy="45.8" r="0.9" fill="#FFFFFF" />
          <circle cx="80.2" cy="45.8" r="0.9" fill="#FFFFFF" />

          {/* ── Blink overlays ── */}
          <rect x="52.5" y="43.5" width="17" height="7" rx="3" fill="#F5DEB3" className="animate-blink" />
          <rect x="70.5" y="43.5" width="17" height="7" rx="3" fill="#F5DEB3" className="animate-blink" />

          {/* ── Nose ── */}
          <path d="M70 53 C68 55, 69 57, 71.5 56" stroke="#C4A882" strokeWidth="1.5" fill="none" />

          {/* ── Beard ── */}
          <path
            d="M52 58 C52 72, 60 80, 70 80 C80 80, 88 72, 88 58"
            fill="#E8E8E8"
            stroke="#D0D0D0"
            strokeWidth="1.8"
          />
          {/* Beard texture strokes */}
          <path d="M58 62 C59 70, 63 76, 67 78" stroke="#D4D4D4" strokeWidth="1.2" fill="none" />
          <path d="M82 62 C81 70, 77 76, 73 78" stroke="#D4D4D4" strokeWidth="1.2" fill="none" />
          <path d="M70 64 C70 70, 70 76, 70 80" stroke="#D4D4D4" strokeWidth="1" fill="none" />

          {/* ── Mouth ── */}
          {state === "talking" ? (
            <ellipse cx="70" cy="61" rx="4" ry="3" fill="#1A1A1A" opacity="0.7">
              <animate attributeName="ry" values="3;1.5;3" dur="0.45s" repeatCount="indefinite" />
            </ellipse>
          ) : (
            <path d="M64 60 C66 63, 74 63, 76 60" stroke="#1A1A1A" strokeWidth="1.8" fill="none" />
          )}

          {/* ── Left arm ── */}
          <path
            d="M48 92 C39 87, 37 96, 41 102"
            stroke="#2C2C2C"
            strokeWidth="4"
            fill="none"
          />

          {/* ── Right arm ── */}
          {state === "drawing" ? (
            <path
              d="M92 89 C101 80, 110 74, 115 70"
              stroke="#2C2C2C"
              strokeWidth="4"
              fill="none"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 92 89;-4 92 89;0 92 89;4 92 89;0 92 89"
                dur="2s"
                repeatCount="indefinite"
              />
            </path>
          ) : (
            <path
              d="M92 91 C101 86, 103 91, 101 97"
              stroke="#2C2C2C"
              strokeWidth="4"
              fill="none"
            />
          )}

          {/* ── Chalk piece in right hand ── */}
          <rect
            x={state === "drawing" ? 112 : 98}
            y={state === "drawing" ? 67 : 94}
            width="9"
            height="4"
            rx="2"
            fill="#F5F0E8"
            stroke="#D8D0C0"
            strokeWidth="1"
            transform={state === "drawing" ? "rotate(-35, 116, 69)" : "rotate(15, 102, 96)"}
          />

          {/* ── State overlays ── */}

          {/* Thinking: thought bubble dots above head */}
          {state === "thinking" && (
            <>
              <circle cx="92" cy="12" r="3.5" fill="#3B6FCA" opacity="0.7" style={{ animation: "dots-pulse 1.2s 0s infinite" }} />
              <circle cx="100" cy="6" r="3.5" fill="#3B6FCA" opacity="0.7" style={{ animation: "dots-pulse 1.2s 0.25s infinite" }} />
              <circle cx="108" cy="12" r="3.5" fill="#3B6FCA" opacity="0.7" style={{ animation: "dots-pulse 1.2s 0.5s infinite" }} />
            </>
          )}

          {/* Listening: sound wave rings near ear */}
          {state === "listening" && (
            <>
              <circle cx="45" cy="48" r="6" stroke="#3B6FCA" strokeWidth="1.5" fill="none" opacity="0.5" style={{ animation: "sound-wave 1.5s 0s infinite" }} />
              <circle cx="45" cy="48" r="11" stroke="#3B6FCA" strokeWidth="1" fill="none" opacity="0.3" style={{ animation: "sound-wave 1.5s 0.3s infinite" }} />
              <circle cx="45" cy="48" r="16" stroke="#3B6FCA" strokeWidth="0.8" fill="none" opacity="0.2" style={{ animation: "sound-wave 1.5s 0.6s infinite" }} />
            </>
          )}

          {/* Excited: 4 star bursts */}
          {state === "excited" && (
            <>
              <polygon points="100,28 102,33 107,33 103,36 105,41 100,38 95,41 97,36 93,33 98,33" fill="#3B6FCA" opacity="0.7" style={{ animation: "star-burst 0.6s ease-out forwards" }} />
              <polygon points="42,30 43,33 46,33 44,35 45,38 42,36 39,38 40,35 38,33 41,33" fill="#3B6FCA" opacity="0.5" style={{ animation: "star-burst 0.6s 0.15s ease-out forwards" }} />
              <polygon points="54,16 55,19 58,19 56,21 57,24 54,22 51,24 52,21 50,19 53,19" fill="#E05252" opacity="0.6" style={{ animation: "star-burst 0.6s 0.08s ease-out forwards" }} />
              <polygon points="86,14 87,17 90,17 88,19 89,22 86,20 83,22 84,19 82,17 85,17" fill="#3B6FCA" opacity="0.4" style={{ animation: "star-burst 0.6s 0.22s ease-out forwards" }} />
            </>
          )}
        </svg>
      </div>

      {/* Celebrating confetti — 6 chalk stroke shapes */}
      {state === "celebrating" && (
        <div className="absolute inset-0 pointer-events-none overflow-visible">
          {[...Array(6)].map((_, i) => {
            const angle = (i / 6) * 360;
            const dist = 35 + Math.random() * 25;
            const colors = ["#3B6FCA", "#E05252", "#F5DEB3", "#4CAF50", "#3B6FCA", "#E05252"];
            return (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${50 + Math.cos((angle * Math.PI) / 180) * dist}%`,
                  top: `${40 + Math.sin((angle * Math.PI) / 180) * dist}%`,
                  width: i % 2 === 0 ? 8 : 5,
                  height: i % 2 === 0 ? 3 : 5,
                  borderRadius: i % 2 === 0 ? "1px" : "50%",
                  backgroundColor: colors[i],
                  animationDelay: `${i * 0.08}s`,
                  transform: `rotate(${angle}deg)`,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MrWhite;
