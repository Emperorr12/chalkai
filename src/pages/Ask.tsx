import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { resolveWhiteboardData, resolveLayout } from "@/lib/resolveWhiteboardLayout";
import { startTimeline } from "@/lib/TimelineEngine";
import { buildElementsFromTemplate } from "@/components/Whiteboard";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { type MrWhiteState } from "../components/MrWhite";
import Whiteboard, { type WhiteboardElement } from "../components/Whiteboard";
import ChatPanel, { type ChatMessage } from "../components/ChatPanel";
import { toast } from "sonner";
import { MessageSquare, PanelRightClose, Volume2, VolumeX, Volume1 } from "lucide-react";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useAuth } from "@/contexts/AuthContext";
import { useLearningProfile } from "@/hooks/useLearningProfile";
import { useSavedConcepts } from "@/hooks/useSavedConcepts";
import MasteryCelebration from "@/components/MasteryCelebration";
import PricingModal from "@/components/PricingModal";
import { hasReachedLimit, incrementDailyCount } from "@/hooks/useDailyQuestionLimit";
import { useLessons } from "@/hooks/useLessons";
import { useSubscription } from "@/hooks/useSubscription";

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
  const { saveConcept, concepts } = useSavedConcepts();
  const { speak, stop: stopTTS, isPlaying: isTTSPlaying, voiceEnabled, setVoiceEnabled, volume, setVolume, audioRef } = useTextToSpeech();
  const { saveLesson } = useLessons();
  const { isPro, tier, startCheckout, refresh: refreshSubscription } = useSubscription();

  const [showVolSlider, setShowVolSlider] = useState(false);
  const volTimeoutRef = useRef<number>(0);

  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsDesktop(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const [activeSubject, setActiveSubject] = useState(() => {
    return localStorage.getItem("chalk_last_subject") || "Math";
  });
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "mr_white", content: "What should we tackle today? I'm warmed up and my chalk is ready! 🎓", timestamp: Date.now() },
  ]);
  const [lastQuestion, setLastQuestion] = useState<{ text: string; fileData?: { data: string; type: string; name: string } } | null>(null);
  const [mrWhiteState, setMrWhiteState] = useState<MrWhiteState>("idle");
  const [quickChips, setQuickChips] = useState(defaultChips);
  const [isTyping, setIsTyping] = useState(false);
  const [whiteboardData, setWhiteboardData] = useState<{ title: string; elements: WhiteboardElement[] } | null>(null);
  const [chalkedCount, setChalkedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [startTime] = useState(Date.now());
  const [currentTopic, setCurrentTopic] = useState<string>("");
  const [showCelebration, setShowCelebration] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  
  const [chatOpen, setChatOpen] = useState(true);
  const [triggeredElements, setTriggeredElements] = useState<Set<number>>(new Set());
  const cancelTimelineRef = useRef<(() => void) | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const autoSentRef = useRef(false);

  // Track session duration on unmount; also cancel any running timeline.
  useEffect(() => {
    return () => {
      cancelTimelineRef.current?.();
      const mins = Math.floor((Date.now() - startTime) / 60000);
      if (mins >= 1 && user) {
        trackSession(mins);
      }
    };
  }, [startTime, user, trackSession]);

  // Save subject to localStorage
  useEffect(() => {
    localStorage.setItem("chalk_last_subject", activeSubject);
  }, [activeSubject]);

  const handleSend = useCallback(async (message: string, fileData?: { data: string; type: string; name: string }) => {
    const isImage = fileData?.type.startsWith("image/");
    setLastQuestion({ text: message, fileData });
    setMessages((prev) => [...prev, { 
      role: "student", 
      content: message, 
      imagePreview: isImage ? fileData?.data : undefined,
      fileName: fileData?.name,
      fileType: fileData?.type,
      timestamp: Date.now(),
    }]);

    // Check daily free limit (skip for Pro users)
    if (!isPro && hasReachedLimit()) {
      setMrWhiteState("excited");
      setMessages((prev) => [
        ...prev,
        {
          role: "mr_white",
          content:
            "You've been crushing it — 5 concepts today! Ready to go unlimited? Upgrade to Pro and I'll never make you stop. 🎓",
          timestamp: Date.now(),
        },
      ]);
      setQuickChips(["Upgrade to Pro", "Ask anything"]);
      setTimeout(() => setMrWhiteState("idle"), 3000);
      return;
    }
    if (!isPro) incrementDailyCount();

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
    cancelTimelineRef.current?.();
    cancelTimelineRef.current = null;

    // For follow-up questions, erase the current board before calling the API.
    // This makes Mr. White feel like he's wiping the chalkboard before the new lesson.
    if (!isFirstQuestion && whiteboardData) {
      setWhiteboardData(null);
      setTriggeredElements(new Set());
      await new Promise<void>((resolve) => setTimeout(resolve, 400));
    }

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

      // Save lesson data
      const wbData = resolveWhiteboardData(aiResponse.whiteboard);

      saveLesson({
        question: message,
        message: aiResponse.message,
        whiteboard: wbData,
        audio_text: aiResponse.message,
        subject: activeSubject,
      });

      // Voice + whiteboard draw simultaneously, then settle when voice ends
      const onVoiceStart = () => {
        // Reveal message text + start whiteboard drawing at the same time as voice
        setIsTyping(false);
        setMessages((prev) => [...prev, { role: "mr_white", content: aiResponse.message, timestamp: Date.now() }]);
        setMrWhiteState("talking");

        if (wbData) {
          setWhiteboardData(wbData);

          // Compute the final elements array the same way Whiteboard would.
          let elements: WhiteboardElement[] = [];
          if (wbData.template && (!wbData.elements || wbData.elements.length === 0)) {
            elements = buildElementsFromTemplate(wbData.template, wbData.labels || []);
          } else if (wbData.layout) {
            elements = resolveLayout(wbData.layout, wbData.labels || [], wbData.colors || []);
          } else if (wbData.elements && wbData.elements.length > 0) {
            elements = wbData.elements;
          }

          // Start the audio-synchronized timeline if we have elements and audio.
          cancelTimelineRef.current?.();
          setTriggeredElements(new Set());
          if (elements.length > 0 && audioRef.current) {
            cancelTimelineRef.current = startTimeline(
              audioRef.current,
              elements,
              (index) => setTriggeredElements((prev) => new Set([...prev, index])),
            );
          }
        }
      };

      const onVoiceEnd = () => {
        const finalState = aiResponse.mr_white_state || "idle";
        setMrWhiteState(finalState);
        if (finalState !== "idle") {
          setTimeout(() => setMrWhiteState("idle"), 3000);
        }
      };

      // Speak — keeps "thinking" until audio is ready, then reveals text + draws + plays voice together
      speak(
        aiResponse.message,
        onVoiceStart,
        onVoiceEnd,
      );

      // Track the topic if detected
      if (aiResponse.topic_detected && user) {
        setCurrentTopic(aiResponse.topic_detected);
        trackTopic(aiResponse.topic_detected, activeSubject);
      }

      if (aiResponse.quick_chips && aiResponse.quick_chips.length > 0) {
        setQuickChips(aiResponse.quick_chips);
      } else {
        setQuickChips(defaultChips);
      }

      
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("Chat error:", err);
      setIsTyping(false);
      setErrorMessage("Something went wrong");
      setMrWhiteState("idle");
    }
    // Note: setIsTyping(false) is handled by onVoiceStart callback, not here
  }, [messages, activeSubject, user, currentTopic, trackTopic, trackSimplification, getProfileSummary]);

  const handleRetry = useCallback(() => {
    if (lastQuestion) {
      setErrorMessage(null);
      handleSend(lastQuestion.text, lastQuestion.fileData);
    }
  }, [lastQuestion, handleSend]);

  const handleChipClick = useCallback(
    (chip: string) => {
      // Open pricing modal
      if (chip.toLowerCase().includes("upgrade to pro") || chip.toLowerCase().includes("see chalk pro")) {
        setShowPricing(true);
        return;
      }
      // "Chalk it up" marks current topic as mastered and triggers celebration
      if (chip.toLowerCase().includes("chalk") && currentTopic && user) {
        markMastered(currentTopic, activeSubject);
        setChalkedCount((c) => c + 1);
        setMrWhiteState("celebrating");
        setShowCelebration(true);
        setTimeout(() => setMrWhiteState("idle"), 2000);
      }
      handleSend(chip);
    },
    [handleSend, currentTopic, activeSubject, user, markMastered]
  );

  const handleListeningChange = useCallback((listening: boolean) => {
    setMrWhiteState(listening ? "listening" : "idle");
  }, []);

  const handleReplay = useCallback((question: string, message: string) => {
    // Find matching lesson from localStorage
    const raw = localStorage.getItem("chalk_lesson_history");
    if (!raw) return;
    const lessons = JSON.parse(raw);
    const lesson = [...lessons].reverse().find(
      (l: any) => l.question === question && l.message === message
    );
    if (!lesson) return;

    // Clear whiteboard, then replay
    setWhiteboardData(null);
    setTimeout(() => {
      setMrWhiteState("talking");
      speak(
        lesson.audio_text,
        () => setMrWhiteState("talking"),
        () => {
          if (lesson.whiteboard && lesson.whiteboard.elements?.length > 0) {
            const replayWb = resolveWhiteboardData(lesson.whiteboard) || lesson.whiteboard;
            setWhiteboardData(replayWb);
            setMrWhiteState("drawing");
            const dur = (replayWb.elements.length || 1) * 800;
            setTimeout(() => setMrWhiteState("idle"), dur);
          } else {
            setMrWhiteState("idle");
          }
        },
      );
    }, 100);
  }, [speak]);

  // Auto-send question from query param
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !autoSentRef.current) {
      autoSentRef.current = true;
      setSearchParams({}, { replace: true });
      setTimeout(() => handleSend(q), 100);
    }
  }, [searchParams, setSearchParams, handleSend]);

  // Handle checkout success
  const checkoutHandledRef = useRef(false);
  useEffect(() => {
    if (searchParams.get("checkout") === "success" && !checkoutHandledRef.current) {
      checkoutHandledRef.current = true;
      setSearchParams({}, { replace: true });
      refreshSubscription();
      setMrWhiteState("celebrating");
      setShowCelebration(true);
      setMessages((prev) => [
        ...prev,
        { role: "mr_white", content: "Welcome to Chalk Pro! Now let's really get to work. 🎉🎓", timestamp: Date.now() },
      ]);
      setTimeout(() => setMrWhiteState("idle"), 4000);
    }
  }, [searchParams, setSearchParams, refreshSubscription]);

  const sessionMinutes = Math.floor((Date.now() - startTime) / 60000);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Navbar />
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative overflow-hidden">
        {/* Whiteboard */}
        <div className="flex flex-col items-center p-2 lg:p-4 flex-shrink-0 lg:flex-1 lg:min-h-0">
          <div className="flex items-center gap-2 mb-2 lg:mb-4 flex-shrink-0">
            <div className="flex flex-wrap gap-1.5 lg:gap-2">
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
            <div
              className="relative flex-shrink-0"
              onMouseEnter={() => { clearTimeout(volTimeoutRef.current); setShowVolSlider(true); }}
              onMouseLeave={() => { volTimeoutRef.current = window.setTimeout(() => setShowVolSlider(false), 1000); }}
            >
              <button
                onClick={() => { setVoiceEnabled((v) => !v); if (isTTSPlaying) stopTTS(); }}
                className={`p-1.5 rounded-full border transition-colors ${
                  voiceEnabled
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground hover:border-primary"
                }`}
                aria-label={voiceEnabled ? "Disable voice" : "Enable voice"}
                title={voiceEnabled ? "Voice on" : "Voice off"}
              >
                {voiceEnabled ? (
                  volume > 0.5 ? <Volume2 className={`w-4 h-4 ${isTTSPlaying ? "animate-pulse" : ""}`} /> : <Volume1 className={`w-4 h-4 ${isTTSPlaying ? "animate-pulse" : ""}`} />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
              </button>
              {/* Volume slider popup */}
              <div className={`absolute left-full top-1/2 -translate-y-1/2 ml-2 transition-opacity duration-200 z-50 ${showVolSlider ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
                <div className="bg-background border border-border rounded-lg shadow-lg px-3 py-2 flex items-center gap-2" style={{ width: 140 }}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(volume * 100)}
                    onChange={(e) => setVolume(Number(e.target.value) / 100)}
                    className="w-20 accent-primary cursor-pointer"
                    aria-label="Volume"
                  />
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{Math.round(volume * 100)}%</span>
                </div>
              </div>
            </div>
          </div>
          <Whiteboard whiteboardData={whiteboardData} mrWhiteState={mrWhiteState} className="w-full min-h-[200px] lg:flex-1 lg:min-h-[0px] lg:h-full" onAskAbout={(text) => handleSend(`Can you explain this in more detail: "${text}"?`)} triggeredElements={triggeredElements} />
        </div>

        {/* Toggle button - desktop only */}
        <button
          onClick={() => setChatOpen((o) => !o)}
          className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-card border border-border rounded-l-lg p-2 shadow-md hover:bg-accent transition-colors"
          style={chatOpen ? { right: '38%' } : { right: 0 }}
          aria-label={chatOpen ? "Hide chat" : "Show chat"}
        >
          {chatOpen ? <PanelRightClose className="w-4 h-4 text-foreground" /> : <MessageSquare className="w-4 h-4 text-foreground" />}
        </button>

        {/* Chat - static scrollable on mobile, collapsible sidebar on desktop */}
        <div className="flex-1 min-h-0 w-full lg:flex-none lg:h-auto lg:border-l lg:border-border lg:transition-all lg:duration-300 lg:overflow-hidden"
          style={isDesktop ? (chatOpen ? { width: '38%' } : { width: 0 }) : undefined}
        >
          <ChatPanel
            messages={messages}
            mrWhiteState={mrWhiteState}
            quickChips={quickChips}
            onSend={handleSend}
            onChipClick={handleChipClick}
            onSaveConcept={user ? (question, explanation) => saveConcept({
              question,
              explanation,
              whiteboard_data: whiteboardData,
              subject: activeSubject,
              topic: currentTopic || undefined,
            }) : undefined}
            savedConceptQuestions={new Set(concepts.map((c) => c.question))}
            onReplay={handleReplay}
            isTyping={isTyping}
            chalkedCount={chalkedCount}
            sessionMinutes={sessionMinutes}
            errorMessage={errorMessage}
            onListeningChange={handleListeningChange}
            activeSubject={activeSubject}
            onRetry={handleRetry}
            className="h-full w-full"
          />
        </div>

        {/* Mastery celebration overlay */}
        <MasteryCelebration
          topic={currentTopic}
          subject={activeSubject}
          visible={showCelebration}
          onClose={() => setShowCelebration(false)}
        />

        {/* Pricing modal */}
        <PricingModal open={showPricing} onOpenChange={setShowPricing} isPro={isPro} currentTier={tier} onStartCheckout={startCheckout} />
      </div>
    </div>
  );
};

export default AskPage;
