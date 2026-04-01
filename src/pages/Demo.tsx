import React, { useState, useEffect, useCallback } from "react";
import Navbar from "../components/Navbar";
import MrWhite, { type MrWhiteState } from "../components/MrWhite";
import Whiteboard, { type WhiteboardElement } from "../components/Whiteboard";
import ChatPanel, { type ChatMessage } from "../components/ChatPanel";

interface DemoStep {
  messages: ChatMessage[];
  mrWhiteState: MrWhiteState;
  whiteboard: { title: string; elements: WhiteboardElement[] };
  chips: string[];
}

const demoSteps: DemoStep[] = [
  {
    messages: [
      { role: "mr_white", content: "Welcome to the demo! I'm Mr. White, and I'm going to show you how I teach. Let's start with one of the most elegant equations in physics — Newton's Second Law. Ready?" },
    ],
    mrWhiteState: "talking",
    whiteboard: {
      title: "Newton's Second Law",
      elements: [
        { kind: "text", content: "F = m × a", color: "blue", size: "large", delay_seconds: 0 },
      ],
    },
    chips: ["Tell me more!", "What does each letter mean?"],
  },
  {
    messages: [
      { role: "student", content: "What does each letter mean?" },
      { role: "mr_white", content: "Great question! F is Force — how hard you push or pull. m is mass — how heavy something is. And a is acceleration — how quickly it speeds up. Imagine pushing a shopping cart: the harder you push, the faster it goes. And a full cart is harder to move than an empty one!" },
    ],
    mrWhiteState: "drawing",
    whiteboard: {
      title: "Breaking it down",
      elements: [
        { kind: "text", content: "F = m × a", color: "blue", size: "large", delay_seconds: 0 },
        { kind: "line", content: "", color: "white", size: "medium", delay_seconds: 0.6 },
        { kind: "text", content: "F → Force (Newtons) — the push", color: "blue", size: "medium", delay_seconds: 1.0 },
        { kind: "text", content: "m → Mass (kg) — the stuff", color: "red", size: "medium", delay_seconds: 1.6 },
        { kind: "text", content: "a → Acceleration (m/s²) — the speed-up", color: "blue", size: "medium", delay_seconds: 2.2 },
      ],
    },
    chips: ["Show me with real numbers", "Quiz me on this"],
  },
  {
    messages: [
      { role: "student", content: "Show me with real numbers" },
      { role: "mr_white", content: "Let's say you push a 10 kg box with a force of 50 Newtons. How fast does it accelerate? Just plug into the formula: a = F ÷ m = 50 ÷ 10 = 5 m/s². That means every second, the box moves 5 meters per second faster. After 3 seconds it's going 15 m/s — that's about 33 mph!" },
    ],
    mrWhiteState: "excited",
    whiteboard: {
      title: "Example: Pushing a box",
      elements: [
        { kind: "text", content: "Given: F = 50N, m = 10kg", color: "blue", size: "large", delay_seconds: 0 },
        { kind: "line", content: "", color: "white", size: "medium", delay_seconds: 0.6 },
        { kind: "text", content: "Find: a = ?", color: "red", size: "medium", delay_seconds: 1.0 },
        { kind: "text", content: "a = F ÷ m", color: "blue", size: "medium", delay_seconds: 1.6 },
        { kind: "text", content: "a = 50 ÷ 10", color: "blue", size: "medium", delay_seconds: 2.2 },
        { kind: "text", content: "a = 5 m/s² ✓", color: "red", size: "large", delay_seconds: 2.8 },
      ],
    },
    chips: ["That makes sense!", "Quiz me now", "Go deeper"],
  },
];

const DemoPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const step = demoSteps[currentStep];

  const allMessages = demoSteps
    .slice(0, currentStep + 1)
    .flatMap((s) => s.messages);

  const handleSend = useCallback((message: string) => {
    if (currentStep < demoSteps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Demo badge */}
      <div className="absolute top-16 right-4 z-50">
        <span className="text-[10px] px-2.5 py-1 rounded-full border border-primary text-primary">
          Demo
        </span>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden" style={{ height: "calc(100vh - 56px)" }}>
        {/* Left - Whiteboard Area */}
        <div className="flex-[6] flex flex-col items-center justify-center p-6 relative overflow-y-auto">
          <div className="text-xs text-muted-foreground mb-4 uppercase tracking-wider">
            Newton's Laws of Motion — Demo
          </div>

          <Whiteboard
            whiteboardData={{ title: step.whiteboard.title, elements: step.whiteboard.elements }}
            className="mb-4"
          />

          <div className="flex items-end gap-3 mt-2">
            <MrWhite state={step.mrWhiteState} size={140} />
            <div className="flex gap-2 mb-4">
              {demoSteps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentStep ? "bg-primary" : "bg-border"
                  }`}
                  aria-label={`Step ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right - Chat Panel */}
        <div className="flex-[4] border-l border-border min-h-0">
          <ChatPanel
            messages={allMessages}
            mrWhiteState={step.mrWhiteState}
            quickChips={step.chips}
            onSend={handleSend}
            onChipClick={handleSend}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
};

export default DemoPage;
