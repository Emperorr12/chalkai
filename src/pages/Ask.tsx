import React, { useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import MrWhite, { type MrWhiteState } from "../components/MrWhite";
import Whiteboard, { type WhiteboardElement } from "../components/Whiteboard";
import ChatPanel, { type ChatMessage } from "../components/ChatPanel";

const subjects = ["Math", "Science", "History", "Economics", "Coding", "English", "Other"];

const defaultChips = ["Show me an example", "Explain it simpler", "Go deeper", "Quiz me on this"];

// Demo responses for when there's no API key
const demoResponses: Record<string, { message: string; state: MrWhiteState; whiteboard: { title: string; elements: WhiteboardElement[] } | null; chips: string[] }> = {
  default: {
    message: "Great question! Let me draw this out for you on the whiteboard so it's crystal clear. Think of it like this — every concept has a shape, and once you see the shape, you never forget it.",
    state: "talking",
    whiteboard: {
      title: "Let's explore this!",
      elements: [
        { kind: "text", content: "Key Concept", color: "blue", size: "large", delay_seconds: 0 },
        { kind: "line", content: "", color: "blue", size: "medium", delay_seconds: 0.5 },
        { kind: "text", content: "→ Understanding builds step by step", color: "white", size: "medium", delay_seconds: 1.0 },
        { kind: "text", content: "→ Each part connects to the next", color: "white", size: "medium", delay_seconds: 1.5 },
        { kind: "text", content: "→ That's the beauty of learning!", color: "red", size: "medium", delay_seconds: 2.0 },
      ],
    },
    chips: defaultChips,
  },
  "what is newton's second law": {
    message: "Newton's Second Law is one of the most beautiful equations in all of physics! It tells us that force equals mass times acceleration. Imagine pushing a shopping cart — the harder you push (more force), the faster it speeds up. And a heavier cart? That needs more force to get moving at the same speed.",
    state: "drawing",
    whiteboard: {
      title: "Newton's Second Law",
      elements: [
        { kind: "text", content: "F = m × a", color: "blue", size: "large", delay_seconds: 0 },
        { kind: "line", content: "", color: "white", size: "medium", delay_seconds: 0.6 },
        { kind: "text", content: "F → Force (Newtons)", color: "blue", size: "medium", delay_seconds: 1.0 },
        { kind: "text", content: "m → Mass (kg)", color: "red", size: "medium", delay_seconds: 1.5 },
        { kind: "text", content: "a → Acceleration (m/s²)", color: "blue", size: "medium", delay_seconds: 2.0 },
        { kind: "arrow", content: "More force = more acceleration!", color: "red", size: "medium", delay_seconds: 2.8 },
      ],
    },
    chips: ["Show me an example with numbers", "What about the first law?", "Quiz me on this", "Go deeper"],
  },
  "what is photosynthesis": {
    message: "Photosynthesis is how plants make their own food — they're like tiny solar-powered kitchens! They take sunlight, water, and carbon dioxide, and transform them into glucose (sugar) and oxygen. It's the reason you can breathe right now!",
    state: "drawing",
    whiteboard: {
      title: "Photosynthesis",
      elements: [
        { kind: "text", content: "☀️ Sunlight + H₂O + CO₂", color: "blue", size: "large", delay_seconds: 0 },
        { kind: "arrow", content: "", color: "blue", size: "large", delay_seconds: 0.8 },
        { kind: "text", content: "→  C₆H₁₂O₆ + O₂", color: "red", size: "large", delay_seconds: 1.4 },
        { kind: "line", content: "", color: "white", size: "medium", delay_seconds: 2.0 },
        { kind: "text", content: "glucose (food) + oxygen (air)", color: "blue", size: "medium", delay_seconds: 2.5 },
        { kind: "text", content: "Plants are solar-powered kitchens!", color: "red", size: "small", delay_seconds: 3.2 },
      ],
    },
    chips: ["Show me the equation breakdown", "Where does this happen in the cell?", "Quiz me", "Explain it simpler"],
  },
};

function findResponse(msg: string) {
  const lower = msg.toLowerCase().trim();
  for (const [key, val] of Object.entries(demoResponses)) {
    if (key !== "default" && lower.includes(key)) return val;
  }
  return demoResponses.default;
}

const AskPage: React.FC = () => {
  const [activeSubject, setActiveSubject] = useState("Math");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "mr_white", content: "What should we tackle today? I'm warmed up and my chalk is ready! 🎓" },
  ]);
  const [mrWhiteState, setMrWhiteState] = useState<MrWhiteState>("idle");
  const [quickChips, setQuickChips] = useState(defaultChips);
  const [isTyping, setIsTyping] = useState(false);
  const [whiteboardActive, setWhiteboardActive] = useState(false);
  const [whiteboardTitle, setWhiteboardTitle] = useState("");
  const [whiteboardElements, setWhiteboardElements] = useState<WhiteboardElement[]>([]);
  const [chalkedCount, setChalkedCount] = useState(0);
  const [startTime] = useState(Date.now());

  const handleSend = useCallback((message: string) => {
    setMessages((prev) => [...prev, { role: "student", content: message }]);
    setMrWhiteState("thinking");
    setIsTyping(true);

    // Simulate response after delay
    setTimeout(() => {
      const response = findResponse(message);
      setIsTyping(false);
      setMrWhiteState(response.state);
      setMessages((prev) => [...prev, { role: "mr_white", content: response.message }]);
      setQuickChips(response.chips);

      if (response.whiteboard) {
        setWhiteboardTitle(response.whiteboard.title);
        setWhiteboardElements(response.whiteboard.elements);
        setWhiteboardActive(true);
        setMrWhiteState("drawing");
        // Return to talking after drawing completes
        setTimeout(() => setMrWhiteState("idle"), response.whiteboard.elements.length * 800);
      }
    }, 1500);
  }, []);

  const handleChipClick = useCallback((chip: string) => {
    if (chip === "Quiz me on this") {
      handleSend(chip);
    } else {
      handleSend(chip);
    }
  }, [handleSend]);

  const sessionMinutes = Math.floor((Date.now() - startTime) / 60000);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden" style={{ height: "calc(100vh - 56px)" }}>
        {/* Left - Whiteboard Area */}
        <div className="flex-[6] flex flex-col items-center justify-center p-6 relative overflow-y-auto">
          {/* Subject pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            {subjects.map((s) => (
              <button
                key={s}
                onClick={() => setActiveSubject(s)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  activeSubject === s
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Whiteboard */}
          <Whiteboard
            whiteboardData={whiteboardActive ? { title: whiteboardTitle, elements: whiteboardElements } : null}
            className="mb-4"
          />

          {/* Mr. White */}
          <div className="flex items-end gap-3 mt-2">
            <MrWhite state={mrWhiteState} size={140} />
            <p className="text-xs text-muted-foreground mb-4">
              {mrWhiteState === "idle" && "Mr. White is ready to help."}
              {mrWhiteState === "thinking" && "Mr. White is thinking..."}
              {mrWhiteState === "drawing" && "Drawing on the whiteboard..."}
              {mrWhiteState === "talking" && "Mr. White is explaining..."}
            </p>
          </div>
        </div>

        {/* Right - Chat Panel */}
        <div className="flex-[4] border-l border-border min-h-0">
          <ChatPanel
            messages={messages}
            mrWhiteState={mrWhiteState}
            quickChips={quickChips}
            onSend={handleSend}
            onChipClick={handleChipClick}
            isTyping={isTyping}
            chalkedCount={chalkedCount}
            sessionMinutes={sessionMinutes}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
};

export default AskPage;
