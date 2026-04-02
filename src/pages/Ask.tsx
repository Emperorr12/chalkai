import React, { useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { type MrWhiteState } from "../components/MrWhite";
import Whiteboard, { type WhiteboardElement } from "../components/Whiteboard";
import ChatPanel, { type ChatMessage } from "../components/ChatPanel";
import { toast } from "sonner";
import { MessageSquare, PanelRightClose } from "lucide-react";

const subjects = ["Math", "Science", "History", "Economics", "Coding", "English", "Other"];
const defaultChips = ["Show me an example", "Explain it simpler", "Go deeper", "Quiz me on this"];

const CONFUSION_WORDS = ["don't understand", "dont understand", "confused", "lost", "help", "don't get it", "dont get it", "what do you mean", "huh", "i'm lost", "im lost"];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mr-white-chat`;

function detectConfusion(text: string): boolean {
  const lower = text.toLowerCase();
  return CONFUSION_WORDS.some((w) => lower.includes(w));
}

interface AIResponse {
  message: string;
  mr_white_state?: MrWhiteState;
  whiteboard?: {
    active: boolean;
    type?: string;
    title?: string;
    elements?: WhiteboardElement[];
  };
  quick_chips?: string[];
  follow_up_hint?: string;
}

const AskPage: React.FC = () => {
  const [activeSubject, setActiveSubject] = useState("Math");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "mr_white", content: "What should we tackle today? I'm warmed up and my chalk is ready! 🎓" },
  ]);
  const [mrWhiteState, setMrWhiteState] = useState<MrWhiteState>("idle");
  const [quickChips, setQuickChips] = useState(defaultChips);
  const [isTyping, setIsTyping] = useState(false);
  const [whiteboardData, setWhiteboardData] = useState<{ title: string; elements: WhiteboardElement[] } | null>(null);
  const [chalkedCount, setChalkedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [startTime] = useState(Date.now());
  
  const [chatOpen, setChatOpen] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const autoSentRef = useRef(false);


  const handleSend = useCallback(async (message: string, imageData?: string) => {
    // Add student message exactly as typed
    setMessages((prev) => [...prev, { role: "student", content: message, imagePreview: imageData }]);
    setMrWhiteState("thinking");
    setIsTyping(true);
    

    // Build context: last 4 messages
    const recentMessages = messages.slice(-4).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const isFirstQuestion = messages.filter((m) => m.role === "student").length === 0;
    const confusionDetected = detectConfusion(message);

    // Abort previous stream if any
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          question: message,
          subject: activeSubject,
          history: recentMessages,
          confusion_detected: confusionDetected,
          is_first_question: isFirstQuestion,
          image_data: imageData || undefined,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: "Request failed" }));
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      const aiResponse: AIResponse = await resp.json();

      setIsTyping(false);

      // Add Mr. White's message
      setMessages((prev) => [...prev, { role: "mr_white", content: aiResponse.message }]);

      // Set Mr. White state
      if (aiResponse.mr_white_state) {
        setMrWhiteState(aiResponse.mr_white_state);
      }

      // Update whiteboard
      if (aiResponse.whiteboard?.active && aiResponse.whiteboard.elements) {
        setWhiteboardData({
          title: aiResponse.whiteboard.title || "",
          elements: aiResponse.whiteboard.elements,
        });
        setMrWhiteState("drawing");
        const drawDuration = (aiResponse.whiteboard.elements.length || 1) * 800;
        setTimeout(() => setMrWhiteState("idle"), drawDuration);
      }

      // Update chips
      if (aiResponse.quick_chips && aiResponse.quick_chips.length > 0) {
        setQuickChips(aiResponse.quick_chips);
      } else {
        setQuickChips(defaultChips);
      }

      setChalkedCount((c) => c + 1);
      setMrWhiteState((prev) => (prev === "drawing" ? prev : "idle"));
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("Chat error:", err);
      setIsTyping(false);
      const errorMessage = err instanceof Error ? err.message : "Something went wrong";
      toast.error(errorMessage);
      setMessages((prev) => [
        ...prev,
        { role: "mr_white", content: "Oops, my chalk broke! Let me try that again — could you rephrase?" },
      ]);
      setMrWhiteState("idle");
    } finally {
      setIsTyping(false);
    }
  }, [messages, activeSubject]);

  const handleChipClick = useCallback(
    (chip: string) => {
      handleSend(chip);
    },
    [handleSend]
  );

  // Auto-send question from query param (homepage input)
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !autoSentRef.current) {
      autoSentRef.current = true;
      setSearchParams({}, { replace: true });
      setTimeout(() => handleSend(q), 100);
    }
  }, [searchParams, setSearchParams, handleSend]);


  const sessionMinutes = Math.floor((Date.now() - startTime) / 60000);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Navbar />
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative">
        {/* Left - Whiteboard Area (dominant) */}
        <div className="flex-1 flex flex-col items-center p-4 overflow-y-auto min-h-0">
          {/* Subject pills */}
          <div className="flex flex-wrap gap-2 mb-4 flex-shrink-0">
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
          <Whiteboard whiteboardData={whiteboardData} mrWhiteState={mrWhiteState} className="flex-1 w-full min-h-0" />
        </div>

        {/* Toggle button */}
        <button
          onClick={() => setChatOpen((o) => !o)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-card border border-border rounded-l-lg p-2 shadow-md hover:bg-accent transition-colors"
          style={chatOpen ? { right: '24rem' } : { right: 0 }}
          aria-label={chatOpen ? "Hide chat" : "Show chat"}
        >
          {chatOpen ? <PanelRightClose className="w-4 h-4 text-foreground" /> : <MessageSquare className="w-4 h-4 text-foreground" />}
        </button>

        {/* Right - Chat Panel (narrow, collapsible) */}
        <div
          className={`flex-shrink-0 border-l border-border min-h-0 max-h-full transition-all duration-300 overflow-hidden ${
            chatOpen ? "w-96 lg:w-80 xl:w-96" : "w-0 border-l-0"
          }`}
        >
          <ChatPanel
            messages={messages}
            mrWhiteState={mrWhiteState}
            quickChips={quickChips}
            onSend={handleSend}
            onChipClick={handleChipClick}
            isTyping={isTyping}
            chalkedCount={chalkedCount}
            sessionMinutes={sessionMinutes}
            className="h-full w-96 lg:w-80 xl:w-96"
          />
        </div>
      </div>
    </div>
  );
};

export default AskPage;
