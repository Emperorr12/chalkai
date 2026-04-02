import React, { useEffect, useState } from "react";
import { Share2, X } from "lucide-react";
import MrWhite from "./MrWhite";

interface MasteryCelebrationProps {
  topic: string;
  subject: string;
  visible: boolean;
  onClose: () => void;
}

const CONFETTI_COLORS = ["#3B6FCA", "#E05252", "#4CAF50", "#F5DEB3", "#FF9800", "#9C27B0", "#00BCD4", "#FF5722"];

const ConfettiPiece: React.FC<{ index: number }> = ({ index }) => {
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const left = Math.random() * 100;
  const delay = Math.random() * 0.4;
  const duration = 1.2 + Math.random() * 0.8;
  const size = 4 + Math.random() * 6;
  const rotation = Math.random() * 360;
  const isCircle = index % 3 === 0;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${left}%`,
        top: "-5%",
        width: isCircle ? size : size * 1.8,
        height: size,
        backgroundColor: color,
        borderRadius: isCircle ? "50%" : "2px",
        transform: `rotate(${rotation}deg)`,
        animation: `confetti-fall ${duration}s ${delay}s ease-out forwards`,
        opacity: 0,
      }}
    />
  );
};

const MasteryCelebration: React.FC<MasteryCelebrationProps> = ({
  topic,
  subject,
  visible,
  onClose,
}) => {
  const [phase, setPhase] = useState<"enter" | "show" | "exit">("enter");
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (!visible) {
      setPhase("enter");
      setShared(false);
      return;
    }
    setPhase("enter");
    const t1 = setTimeout(() => setPhase("show"), 100);
    const t2 = setTimeout(() => {
      // Auto-dismiss after 4 seconds if not interacting
    }, 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [visible]);

  const handleShare = async () => {
    const shareText = `I finally understood "${topic || subject}" using Chalk! 🎓✅`;
    const shareUrl = window.location.origin;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Concept Mastered on Chalk!",
          text: shareText,
          url: shareUrl,
        });
        setShared(true);
      } catch {
        // User cancelled
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        setShared(true);
      } catch {
        // Fallback failed
      }
    }
  };

  const handleClose = () => {
    setPhase("exit");
    setTimeout(onClose, 300);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-auto">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 transition-opacity duration-300"
        style={{ opacity: phase === "exit" ? 0 : 1 }}
        onClick={handleClose}
      />

      {/* Confetti layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(40)].map((_, i) => (
          <ConfettiPiece key={i} index={i} />
        ))}
      </div>

      {/* Card */}
      <div
        className="relative z-10 bg-card border border-border rounded-2xl p-8 max-w-sm w-[90%] text-center shadow-2xl transition-all duration-500"
        style={{
          transform: phase === "enter" ? "scale(0.7) translateY(40px)" : phase === "exit" ? "scale(0.8) translateY(20px)" : "scale(1) translateY(0)",
          opacity: phase === "enter" ? 0 : phase === "exit" ? 0 : 1,
        }}
      >
        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Mr. White celebrating */}
        <div className="flex justify-center mb-4" style={{ animation: "celebrate-bounce 0.6s ease-out" }}>
          <MrWhite state="celebrating" size={100} />
        </div>

        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-3"
          style={{ animation: "badge-pop 0.4s 0.3s ease-out both" }}
        >
          <span className="text-lg">✅</span>
          Concept Mastered
        </div>

        {/* Topic */}
        <h3 className="text-lg font-semibold text-foreground mb-1" style={{ fontFamily: "'Caveat', cursive", fontSize: "1.5rem" }}>
          {topic || "This concept"}
        </h3>
        <p className="text-xs text-muted-foreground mb-5">
          in {subject}
        </p>

        {/* Share */}
        <button
          onClick={handleShare}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
          style={{ animation: "badge-pop 0.4s 0.5s ease-out both" }}
        >
          <Share2 className="w-4 h-4" />
          {shared ? "Shared!" : "Share this"}
        </button>

        <p className="text-[11px] text-muted-foreground mt-3 italic" style={{ fontFamily: "'Caveat', cursive" }}>
          "I finally understood this using Chalk"
        </p>
      </div>
    </div>
  );
};

export default MasteryCelebration;
