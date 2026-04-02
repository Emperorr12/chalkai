import React, { useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { type MrWhiteState } from "../components/MrWhite";
import Whiteboard, { type WhiteboardElement } from "../components/Whiteboard";
import ChatPanel, { type ChatMessage } from "../components/ChatPanel";
import { toast } from "sonner";
import { MessageSquare, PanelRightClose } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLearningProfile } from "@/hooks/useLearningProfile";

const subjects = ["Math", "Science", "History", "Economics", "Coding", "English", "Other"];
const defaultChips = ["Ask anything", "Explain simpler", "Go deeper", "Quiz me"];

const SIMPLIFICATION_PHRASES = ["explain simpler", "explain it simpler", "simplify", "too complicated", "make it simpler", "eli5", "in simple terms", "dumb it down"];
const CONFUSION_WORDS = ["don't understand", "dont understand", "confused", "lost", "help", "don't get it", "dont get it", "what do you mean", "huh", "i'm lost", "im lost"];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mr-white-chat`;

function detectConfusion(text: string): boolean {
  const lower = text.toLowerCase();
  return CONFUSION_WORDS.some((w) => lower.includes(w));
}

function detectSimplification(text: string): boolean {
  const lower = text.toLowerCase();
  return SIMPLIFICATION_PHRASES.some((w) => lower.includes(w));
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
  topic_detected?: string;
}

const AskPage: React.FC = () => {
  const { user } = useAuth();
  const { trackTopic, trackSimplification, trackSession, getProfileSummary, markMastered } = useLearningProfile();

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
  const [currentTopic, setCurrentTopic] = useState<string>("");
  
  const [chatOpen, setChatOpen] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const autoSentRef = useRef(false);

  // Track session duration on unmount
  useEffect(() => {
    return () => {
      const mins = Math.floor((Date.now() - startTime) / 60000);
      if (mins >= 1 && user) {
        trackSession(mins);
      }
    };
  }, [startTime, user, trackSession]);

  const handleSend = useCallback(async (message: string, fileData?: { data: string; type: string; name: string }) => {
    const isImage = fileData?.type.startsWith("image/");
    setMessages((prev) => [...prev, { 
      role: "student", 
      content: message, 
      imagePreview: isImage ? fileData?.data : undefined,
      fileName: fileData?.name,
      fileType: fileData?.type,
    }]);
    setMrWhiteState("thinking");
    setIsTyping(true);
    setErrorMessage(null);

    // Detect simplification requests and track them
    const isSimplification = detectSimplification(message);
    if (isSimplification && currentTopic && user) {
      trackSimplification(currentTopic, activeSubject);
    }

    // Build context
    const recentMessages = messages.slice(-4).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const isFirstQuestion = messages.filter((m) => m.role === "student").length === 0;
    const confusionDetected = detectConfusion(message);

    // Get learning profile summary
    const profileSummary = user ? getProfileSummary() : "";

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
          file_data: fileData?.data || undefined,
          file_type: fileData?.type || undefined,
          file_name: fileData?.name || undefined,
          student_profile: profileSummary || undefined,
        }),
        signal: controller.signal,
      });

      const rawText = await resp.text();
      console.log("[mr-white-chat] Raw response:", rawText);

      if (!resp.ok) {
        let errMsg = `Error ${resp.status}`;
        try { errMsg = JSON.parse(rawText).error || errMsg; } catch {}
        throw new Error(errMsg);
      }

      const aiResponse: AIResponse = JSON.parse(rawText);

      setIsTyping(false);
      setMrWhiteState("talking");
      setMessages((prev) => [...prev, { role: "mr_white", content: aiResponse.message }]);

      // Track the topic if detected
      if (aiResponse.topic_detected && user) {
        setCurrentTopic(aiResponse.topic_detected);
        trackTopic(aiResponse.topic_detected, activeSubject);
      }

      // Update whiteboard
      if (aiResponse.whiteboard?.active && aiResponse.whiteboard.elements) {
        setWhiteboardData({
          title: aiResponse.whiteboard.title || "",
          elements: aiResponse.whiteboard.elements,
        });
        setMrWhiteState("drawing");
        const drawDuration = (aiResponse.whiteboard.elements.length || 1) * 800;
        setTimeout(() => {
          const finalState = aiResponse.mr_white_state || "idle";
          setMrWhiteState(finalState);
          if (finalState !== "idle") {
            setTimeout(() => setMrWhiteState("idle"), 3000);
          }
        }, drawDuration);
      } else {
        const finalState = aiResponse.mr_white_state || "talking";
        setMrWhiteState(finalState);
        setTimeout(() => setMrWhiteState("idle"), 3000);
      }

      if (aiResponse.quick_chips && aiResponse.quick_chips.length > 0) {
        setQuickChips(aiResponse.quick_chips);
      } else {
        setQuickChips(defaultChips);
      }

      setChalkedCount((c) => c + 1);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("Chat error:", err);
      setIsTyping(false);
      const errMsg = err instanceof Error ? err.message : "Something went wrong";
      setErrorMessage(errMsg);
      toast.error(errMsg);
      setMessages((prev) => [
        ...prev,
        { role: "mr_white", content: "Oops, my chalk broke! Let me try that again — could you rephrase?" },
      ]);
      setMrWhiteState("idle");
    } finally {
      setIsTyping(false);
    }
  }, [messages, activeSubject, user, currentTopic, trackTopic, trackSimplification, getProfileSummary]);

  const handleChipClick = useCallback(
    (chip: string) => {
      // "Chalk it up" marks current topic as mastered
      if (chip.toLowerCase().includes("chalk") && currentTopic && user) {
        markMastered(currentTopic, activeSubject);
      }
      handleSend(chip);
    },
    [handleSend, currentTopic, activeSubject, user, markMastered]
  );

  const handleListeningChange = useCallback((listening: boolean) => {
    setMrWhiteState(listening ? "listening" : "idle");
  }, []);

  // Auto-send question from query param
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
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative overflow-hidden">
        {/* Whiteboard */}
        <div className="flex flex-col items-center p-2 lg:p-4 flex-1 min-h-0 lg:overflow-y-auto">
          <div className="flex flex-wrap gap-1.5 lg:gap-2 mb-2 lg:mb-4 flex-shrink-0">
            {subjects.map((s) => (
              <button
                key={s}
                onClick={() => setActiveSubject(s)}
                className={`text-xs px-2.5 py-1 lg:px-3 lg:py-1.5 rounded-full border transition-colors ${
                  activeSubject === s
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <Whiteboard whiteboardData={whiteboardData} mrWhiteState={mrWhiteState} className="w-full flex-1 min-h-0 lg:min-h-0" onAskAbout={(text) => handleSend(`Can you explain this in more detail: "${text}"?`)} />
        </div>

        {/* Toggle button - desktop only */}
        <button
          onClick={() => setChatOpen((o) => !o)}
          className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-card border border-border rounded-l-lg p-2 shadow-md hover:bg-accent transition-colors"
          style={chatOpen ? { right: '24rem' } : { right: 0 }}
          aria-label={chatOpen ? "Hide chat" : "Show chat"}
        >
          {chatOpen ? <PanelRightClose className="w-4 h-4 text-foreground" /> : <MessageSquare className="w-4 h-4 text-foreground" />}
        </button>

        {/* Chat - static scrollable on mobile, collapsible sidebar on desktop */}
        <div className="flex-1 min-h-0 lg:flex-none lg:h-auto lg:border-l lg:border-border lg:transition-all lg:duration-300 lg:overflow-hidden lg:w-96 xl:w-96"
          style={chatOpen ? undefined : { width: 0 }}
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
            errorMessage={errorMessage}
            onListeningChange={handleListeningChange}
            className="h-full w-full lg:w-96 xl:w-96"
          />
        </div>
      </div>
    </div>
  );
};

export default AskPage;
