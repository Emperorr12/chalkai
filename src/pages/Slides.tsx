import React, { useState, useCallback, useRef } from "react";
import Navbar from "../components/Navbar";
import MrWhite, { type MrWhiteState } from "../components/MrWhite";
import Whiteboard, { type WhiteboardElement } from "../components/Whiteboard";
import ChatPanel, { type ChatMessage } from "../components/ChatPanel";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Upload, MessageSquare, PanelRightClose } from "lucide-react";

interface SlideData {
  slide_number: number;
  content: string;
}

const PROCESS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-slides`;
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mr-white-chat`;

const defaultChips = ["Explain simpler", "Go deeper", "Quiz me", "Key takeaways"];

const SlidesPage: React.FC = () => {
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState("");

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "mr_white", content: "Upload your slides and I'll walk you through them one by one! 📄" },
  ]);
  const [mrWhiteState, setMrWhiteState] = useState<MrWhiteState>("idle");
  const [quickChips, setQuickChips] = useState(defaultChips);
  const [isTyping, setIsTyping] = useState(false);
  const [whiteboardData, setWhiteboardData] = useState<{ title: string; elements: WhiteboardElement[] } | null>(null);
  const [chatOpen, setChatOpen] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Ask Mr. White to explain a slide
  const explainSlide = useCallback(async (slide: SlideData, history: ChatMessage[]) => {
    const question = `Please explain slide ${slide.slide_number}. Here's what's on it:\n\n${slide.content}`;

    setMessages((prev) => [...prev, { role: "student", content: `📄 Slide ${slide.slide_number}` }]);
    setMrWhiteState("thinking");
    setIsTyping(true);

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
          question,
          subject: "General",
          history: history.slice(-4).map((m) => ({ role: m.role, content: m.content })),
          is_first_question: history.filter((m) => m.role === "student").length === 0,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) throw new Error(`Error ${resp.status}`);
      const ai = await resp.json();

      setIsTyping(false);
      setMrWhiteState("talking");
      setMessages((prev) => [...prev, { role: "mr_white", content: ai.message }]);

      const wbData = resolveWhiteboardData(ai.whiteboard);
      if (wbData) {
        setWhiteboardData(wbData);
        setMrWhiteState("drawing");
        const dur = (wbData.elements.length || 1) * 800;
        setTimeout(() => {
          setMrWhiteState(ai.mr_white_state || "idle");
          setTimeout(() => setMrWhiteState("idle"), 3000);
        }, dur);
      } else {
        setTimeout(() => setMrWhiteState("idle"), 3000);
      }

      if (ai.quick_chips?.length) setQuickChips(ai.quick_chips);
      else setQuickChips(defaultChips);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setIsTyping(false);
      setMrWhiteState("idle");
      toast.error("Mr. White hit a snag. Try again!");
      setMessages((prev) => [...prev, { role: "mr_white", content: "Oops, my chalk broke! Let me try that again." }]);
    }
  }, []);

  // Handle file upload
  const handleUpload = useCallback(async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }

    setIsUploading(true);
    setFileName(file.name);
    setMrWhiteState("thinking");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const resp = await fetch(PROCESS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: formData,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }

      const data = await resp.json();
      const extractedSlides: SlideData[] = data.slides;

      if (!extractedSlides || extractedSlides.length === 0) {
        throw new Error("No slides found in the PDF");
      }

      setSlides(extractedSlides);
      setCurrentSlide(0);
      setMessages((prev) => [
        ...prev,
        { role: "mr_white", content: `I found ${extractedSlides.length} slide${extractedSlides.length > 1 ? "s" : ""} in "${file.name}". Let me walk you through the first one!` },
      ]);

      // Auto-explain slide 1
      setTimeout(() => {
        explainSlide(extractedSlides[0], messages);
      }, 500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
      setMessages((prev) => [...prev, { role: "mr_white", content: `Hmm, I couldn't read that file. ${msg}` }]);
      setMrWhiteState("idle");
    } finally {
      setIsUploading(false);
    }
  }, [messages, explainSlide]);

  // Navigate slides
  const goToSlide = useCallback((index: number) => {
    if (index < 0 || index >= slides.length) return;
    setCurrentSlide(index);
    explainSlide(slides[index], messages);
  }, [slides, messages, explainSlide]);

  // Handle chat send
  const handleSend = useCallback(async (message: string) => {
    setMessages((prev) => [...prev, { role: "student", content: message }]);
    setMrWhiteState("thinking");
    setIsTyping(true);

    const context = slides.length > 0
      ? `The student is viewing slide ${currentSlide + 1} of ${slides.length}. Slide content: ${slides[currentSlide]?.content || ""}`
      : "";

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
          question: `${context}\n\nStudent question: ${message}`,
          subject: "General",
          history: messages.slice(-4).map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: controller.signal,
      });

      if (!resp.ok) throw new Error(`Error ${resp.status}`);
      const ai = await resp.json();

      setIsTyping(false);
      setMrWhiteState("talking");
      setMessages((prev) => [...prev, { role: "mr_white", content: ai.message }]);

      if (ai.whiteboard?.active && ai.whiteboard.elements) {
        setWhiteboardData({ title: ai.whiteboard.title || "", elements: ai.whiteboard.elements });
        setMrWhiteState("drawing");
        setTimeout(() => {
          setMrWhiteState("idle");
        }, (ai.whiteboard.elements.length || 1) * 800 + 3000);
      } else {
        setTimeout(() => setMrWhiteState("idle"), 3000);
      }

      if (ai.quick_chips?.length) setQuickChips(ai.quick_chips);
      else setQuickChips(defaultChips);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setIsTyping(false);
      setMrWhiteState("idle");
      setMessages((prev) => [...prev, { role: "mr_white", content: "Oops, my chalk broke! Try again?" }]);
    }
  }, [messages, slides, currentSlide]);

  const slide = slides[currentSlide];

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Navbar />
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative">
        {/* Left - Slide viewer & whiteboard */}
        <div className="flex-1 flex flex-col items-center p-4 overflow-y-auto min-h-0">
          {/* Upload area or slide viewer */}
          {slides.length === 0 ? (
            <div className="flex-1 flex items-center justify-center w-full">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex flex-col items-center gap-4 p-12 border-2 border-dashed border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group"
              >
                {isUploading ? (
                  <>
                    <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-muted-foreground">Processing {fileName}...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-muted-foreground group-hover:text-primary transition-colors" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">Upload your slides</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF files supported</p>
                    </div>
                  </>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="hidden"
              />
            </div>
          ) : (
            <>
              {/* Slide content card */}
              <div className="w-full max-w-2xl mb-4 flex-shrink-0">
                <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">
                      {fileName} — Slide {currentSlide + 1} of {slides.length}
                    </span>
                  </div>
                  <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-light min-h-[100px]">
                    {slide?.content || "(Empty slide)"}
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-center gap-4 mt-4">
                  <button
                    onClick={() => goToSlide(currentSlide - 1)}
                    disabled={currentSlide === 0}
                    className="p-2 rounded-full border border-border hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Previous slide"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="flex gap-1.5">
                    {slides.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => goToSlide(i)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          i === currentSlide ? "bg-primary" : "bg-border hover:bg-primary/50"
                        }`}
                        aria-label={`Go to slide ${i + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => goToSlide(currentSlide + 1)}
                    disabled={currentSlide === slides.length - 1}
                    className="p-2 rounded-full border border-border hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Next slide"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Whiteboard */}
              <Whiteboard
                whiteboardData={whiteboardData}
                mrWhiteState={mrWhiteState}
                className="w-full max-w-2xl"
                onAskAbout={(text) => handleSend(`Can you explain this in more detail: "${text}"?`)}
              />
            </>
          )}

          {/* Mr. White character */}
          <div className="flex items-end gap-3 mt-4 flex-shrink-0">
            <MrWhite state={mrWhiteState} size={140} />
          </div>
        </div>

        {/* Toggle button */}
        <button
          onClick={() => setChatOpen((o) => !o)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-card border border-border rounded-l-lg p-2 shadow-md hover:bg-accent transition-colors"
          style={chatOpen ? { right: "24rem" } : { right: 0 }}
          aria-label={chatOpen ? "Hide chat" : "Show chat"}
        >
          {chatOpen ? (
            <PanelRightClose className="w-4 h-4 text-foreground" />
          ) : (
            <MessageSquare className="w-4 h-4 text-foreground" />
          )}
        </button>

        {/* Right - Chat panel */}
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
            onChipClick={handleSend}
            isTyping={isTyping}
            className="h-full w-96 lg:w-80 xl:w-96"
          />
        </div>
      </div>
    </div>
  );
};

export default SlidesPage;
