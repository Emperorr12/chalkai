import React, { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Loader2, Bookmark, RotateCcw, Copy, Check } from "lucide-react";
import { type MrWhiteState } from "./MrWhite";
import HighlightAskTooltip from "./HighlightAskTooltip";

export interface ChatMessage {
  role: "mr_white" | "student";
  content: string;
  imagePreview?: string;
  fileName?: string;
  fileType?: string;
  timestamp?: number;
}

const SUBJECT_SUGGESTIONS: Record<string, string[]> = {
  Math: ["What's the difference between permutations and combinations?", "Explain the Pythagorean theorem with a real-world example", "How do derivatives work in calculus?", "What are logarithms and why are they useful?", "Help me understand fractions and decimals", "What's the quadratic formula and when do I use it?"],
  Science: ["How does photosynthesis actually work?", "Explain Newton's three laws of motion", "What is the difference between DNA and RNA?", "How do atoms form chemical bonds?", "What causes the seasons on Earth?", "Explain the water cycle step by step"],
  History: ["What caused World War I?", "Explain the French Revolution in simple terms", "What was the Cold War about?", "How did the Roman Empire fall?", "What was the significance of the Renaissance?", "Explain the Industrial Revolution's impact"],
  Economics: ["What is supply and demand?", "Explain inflation in simple terms", "What's the difference between GDP and GNP?", "How do interest rates affect the economy?", "What is opportunity cost?", "Explain fiscal vs monetary policy"],
  Coding: ["What's the difference between a function and a method?", "Explain recursion with a simple example", "What are APIs and how do they work?", "How does a for loop work?", "What is object-oriented programming?", "Explain the difference between frontend and backend"],
  English: ["How do I write a strong thesis statement?", "Explain the difference between simile and metaphor", "What makes a good essay introduction?", "How do I analyze a poem?", "What's the difference between active and passive voice?", "Explain the five-paragraph essay structure"],
  Other: ["Explain this concept to me like I'm 10", "Help me understand this topic better", "What's an easy way to remember this?", "Can you give me a real-world example?", "Break this down step by step", "Quiz me on what I've learned"],
};

interface ChatPanelProps {
  messages: ChatMessage[];
  mrWhiteState: MrWhiteState;
  quickChips: string[];
  onSend: (message: string, fileData?: { data: string; type: string; name: string }) => void;
  onChipClick: (chip: string) => void;
  onSaveConcept?: (question: string, explanation: string) => void;
  onReplay?: (question: string, message: string) => void;
  isTyping?: boolean;
  chalkedCount?: number;
  sessionMinutes?: number;
  className?: string;
  errorMessage?: string | null;
  onListeningChange?: (listening: boolean) => void;
  savedConceptQuestions?: Set<string>;
  activeSubject?: string;
  onRetry?: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  mrWhiteState,
  quickChips,
  onSend,
  onChipClick,
  onSaveConcept,
  onReplay,
  isTyping = false,
  chalkedCount = 0,
  sessionMinutes = 0,
  className = "",
  errorMessage = null,
  onListeningChange,
  savedConceptQuestions,
  activeSubject = "Math",
  onRetry,
}) => {
  const [input, setInput] = useState("");
  const [hasAnimatedPlaceholder, setHasAnimatedPlaceholder] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ data: string; name: string; type: string; isImage: boolean } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingSpeech, setIsProcessingSpeech] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [interimText, setInterimText] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [hoveredMsgIdx, setHoveredMsgIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userScrolledRef = useRef(false);
  const dragCounterRef = useRef(0);
  const recognitionRef = useRef<any>(null);
  const autoSubmitTimerRef = useRef<number | null>(null);

  // Auto-scroll to bottom, but respect user scroll position
  useEffect(() => {
    if (!userScrolledRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    inputRef.current?.focus();
    const timer = setTimeout(() => setHasAnimatedPlaceholder(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        setInput("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const SUPPORTED_DOC_TYPES = ["application/pdf", "text/plain", "text/csv", "text/markdown", "application/json"];

  const handleFileRead = useCallback((file: File) => {
    const isImage = SUPPORTED_IMAGE_TYPES.includes(file.type);
    const isDoc = SUPPORTED_DOC_TYPES.includes(file.type);
    
    if (!isImage && !isDoc) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const extMap: Record<string, boolean> = { pdf: true, txt: true, csv: true, md: true, json: true };
      if (!ext || !extMap[ext]) return;
    }
    
    if (file.size > 20 * 1024 * 1024) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPendingFile({
        data: dataUrl,
        name: file.name,
        type: file.type || `application/${file.name.split('.').pop()}`,
        isImage: SUPPORTED_IMAGE_TYPES.includes(file.type),
      });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSend = () => {
    const trimmed = input.trim();
    if ((!trimmed && !pendingFile) || isTyping) return;
    const defaultMsg = pendingFile?.isImage ? "What's in this image?" : "Analyze this file";
    onSend(trimmed || defaultMsg, pendingFile ? { data: pendingFile.data, type: pendingFile.type, name: pendingFile.name } : undefined);
    setInput("");
    setPendingFile(null);
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    userScrolledRef.current = scrollHeight - scrollTop - clientHeight > 60;
  };

  const handleCopy = useCallback((text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }, []);

  const formatTimeAgo = (timestamp?: number) => {
    if (!timestamp) return "";
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFileRead(files[0]);
  }, [handleFileRead]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileRead(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [handleFileRead]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setInterimText("");
    onListeningChange?.(false);
    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
    }
  }, [onListeningChange]);

  const startRecording = useCallback(() => {
    setSpeechError(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError("Speech recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsRecording(true);
      setIsProcessingSpeech(false);
      onListeningChange?.(true);
    };

    let finalTranscript = "";

    recognition.onresult = (event: any) => {
      let interim = "";
      finalTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }

      if (finalTranscript) {
        setInput(finalTranscript);
        setInterimText("");
      } else {
        setInterimText(interim);
      }

      if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = window.setTimeout(() => {
        if (finalTranscript) {
          setIsProcessingSpeech(true);
          setTimeout(() => {
            onSend(finalTranscript);
            setInput("");
            setIsRecording(false);
            setIsProcessingSpeech(false);
            setInterimText("");
            onListeningChange?.(false);
          }, 300);
        }
      }, 1500);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== "aborted") {
        setSpeechError("Didn't catch that — try again?");
      }
      setIsRecording(false);
      setIsProcessingSpeech(false);
      onListeningChange?.(false);
    };

    recognition.onend = () => {
      if (finalTranscript && !autoSubmitTimerRef.current) {
        setIsProcessingSpeech(true);
        setTimeout(() => {
          onSend(finalTranscript);
          setInput("");
          setIsRecording(false);
          setIsProcessingSpeech(false);
          onListeningChange?.(false);
        }, 300);
      }
      setIsRecording(false);
      setInterimText("");
    };

    recognition.start();
  }, [onSend, onListeningChange]);

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
    };
  }, []);

  // Check if conversation is "empty" (only the initial welcome message)
  const isEmptyState = messages.length <= 1 && messages[0]?.role === "mr_white";
  const suggestions = SUBJECT_SUGGESTIONS[activeSubject] || SUBJECT_SUGGESTIONS.Other;

  return (
    <div
      className={`flex flex-col h-full bg-background relative ${className}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-primary mb-2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-sm font-medium text-primary">Drop file here</p>
            <p className="text-xs text-muted-foreground">Images, PDFs, text files, CSVs</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
        <span className="text-sm font-medium text-foreground">Mr. White's Notes</span>
        <div className="flex-1" />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {chalkedCount > 0 && (
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {chalkedCount} chalked
            </span>
          )}
          {sessionMinutes > 0 && <span>{sessionMinutes} min</span>}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 relative"
      >
        <HighlightAskTooltip
          containerRef={scrollRef as React.RefObject<HTMLElement>}
          onAsk={(text) => onSend(`Can you explain this in more detail: "${text}"?`)}
        />

        {/* Empty state with suggestions */}
        {isEmptyState && (
          <div className="animate-fade-in">
            {/* Welcome message is already in messages[0] */}
            <div className="mt-6 space-y-3">
              <p className="text-xs text-muted-foreground text-center mb-3">
                Here are some ideas to get started:
              </p>
              <div className="grid grid-cols-1 gap-2">
                {suggestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => onSend(q)}
                    className="text-left text-xs px-3 py-2.5 rounded-lg border border-border bg-card hover:border-primary hover:text-primary transition-colors text-muted-foreground leading-relaxed"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground/60 text-center mt-2">
                or type your own question below
              </p>
            </div>
          </div>
        )}

        {/* Render messages (skip first welcome if empty state shows suggestions) */}
        {messages.map((msg, i) => {
          if (isEmptyState && i === 0) {
            // Render the welcome message inside empty state block above
            return (
              <div key={i} className="flex justify-start animate-fade-in-up">
                <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0 text-[10px] text-primary font-bold">W</span>
                <div className="chalk-bubble max-w-[80%] text-sm leading-relaxed">{msg.content}</div>
              </div>
            );
          }

          const prevStudentMsg = msg.role === "mr_white" && i > 0
            ? messages.slice(0, i).reverse().find((m) => m.role === "student")
            : null;
          const isSaved = prevStudentMsg && savedConceptQuestions?.has(prevStudentMsg.content);
          const canSave = msg.role === "mr_white" && prevStudentMsg && onSaveConcept && i > 0;

          return (
            <div key={i}>
              <div
                className={`flex animate-fade-in-up ${msg.role === "student" ? "justify-end" : "justify-start"}`}
                onMouseEnter={() => setHoveredMsgIdx(i)}
                onMouseLeave={() => setHoveredMsgIdx(null)}
              >
                {msg.role === "mr_white" && (
                  <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0 text-[10px] text-primary font-bold">W</span>
                )}
                <div className="relative group max-w-[80%]">
                  <div
                    {...(msg.role === "mr_white" ? { "data-mr-white-msg": true } : {})}
                    className={`text-sm leading-relaxed ${
                      msg.role === "student" ? "student-bubble" : "chalk-bubble"
                    }`}
                  >
                    {msg.imagePreview && (
                      <img src={msg.imagePreview} alt="Uploaded problem" className="max-w-full max-h-48 rounded-md mb-2 border border-border" />
                    )}
                    {msg.fileName && !msg.imagePreview && (
                      <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-background/30 rounded border border-border/50 text-xs">
                        <span className="font-medium">{msg.fileName.split('.').pop()?.toUpperCase()}</span>
                        <span className="truncate opacity-70">{msg.fileName}</span>
                      </div>
                    )}
                    {msg.content}
                  </div>

                  {/* Timestamp on hover */}
                  {hoveredMsgIdx === i && msg.timestamp && (
                    <span className="absolute -bottom-4 left-0 text-[10px] text-muted-foreground/50 whitespace-nowrap animate-fade-in">
                      {formatTimeAgo(msg.timestamp)}
                    </span>
                  )}

                  {/* Copy button for Mr. White messages */}
                  {msg.role === "mr_white" && i > 0 && (
                    <button
                      onClick={() => handleCopy(msg.content, i)}
                      className="absolute -right-7 top-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-muted-foreground hover:text-foreground"
                      aria-label="Copy message"
                      title="Copy to clipboard"
                    >
                      {copiedIdx === i ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
              {canSave && (
                <div className="ml-9 mt-1 mb-1 flex items-center gap-2">
                  <button
                    onClick={() => onSaveConcept(prevStudentMsg!.content, msg.content)}
                    disabled={!!isSaved}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors inline-flex items-center gap-1 ${
                      isSaved
                        ? "border-green-300 text-green-600 cursor-default"
                        : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                    }`}
                  >
                    <Bookmark className="w-3 h-3" />
                    {isSaved ? "Saved" : "Save concept"}
                  </button>
                  {onReplay && prevStudentMsg && (
                    <button
                      onClick={() => onReplay(prevStudentMsg!.content, msg.content)}
                      className="text-[11px] px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors inline-flex items-center gap-1"
                      title="Replay this lesson"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Replay
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start animate-fade-in-up">
            <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0 text-[10px] text-primary font-bold">W</span>
            <div className="chalk-bubble flex gap-1.5 items-center">
              <span className="w-2 h-2 rounded-full bg-primary" style={{ animation: "dots-pulse 1.2s 0s infinite" }} />
              <span className="w-2 h-2 rounded-full bg-primary" style={{ animation: "dots-pulse 1.2s 0.2s infinite" }} />
              <span className="w-2 h-2 rounded-full bg-primary" style={{ animation: "dots-pulse 1.2s 0.4s infinite" }} />
            </div>
          </div>
        )}

        {/* Error with retry */}
        {errorMessage && onRetry && (
          <div className="flex justify-start animate-fade-in-up">
            <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0 text-[10px] text-primary font-bold">W</span>
            <div className="chalk-bubble max-w-[80%]">
              <p className="text-sm leading-relaxed mb-2">Hmm, I hit a snag. Let me try that again — sometimes I just need a moment.</p>
              <button
                onClick={onRetry}
                className="text-xs px-3 py-1.5 rounded-full border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pending file preview */}
      {pendingFile && (
        <div className="px-4 py-2 border-t border-border flex items-center gap-2 bg-muted/30">
          {pendingFile.isImage ? (
            <img src={pendingFile.data} alt="Pending upload" className="h-12 w-12 object-cover rounded border border-border" />
          ) : (
            <div className="h-12 w-12 rounded border border-border bg-muted flex items-center justify-center text-xs text-muted-foreground font-medium">
              {pendingFile.name.split('.').pop()?.toUpperCase()}
            </div>
          )}
          <span className="text-xs text-muted-foreground flex-1 truncate">{pendingFile.name}</span>
          <button onClick={() => setPendingFile(null)} className="text-muted-foreground hover:text-foreground p-1" aria-label="Remove attachment">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Quick chips */}
      {quickChips.length > 0 && !isEmptyState && (
        <div
          key={quickChips.join(",")}
          className="flex gap-2 px-4 py-2 overflow-x-auto flex-shrink-0"
          style={{ animation: "fade-in 0.2s ease-out" }}
        >
          {quickChips.map((chip) => (
            <button
              key={chip}
              onClick={() => onChipClick(chip)}
              disabled={isTyping}
              className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors whitespace-nowrap flex-shrink-0 disabled:opacity-40"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-border">
        <div className={`flex items-center gap-2 bg-card rounded-full px-4 py-2 border transition-colors ${isTyping ? "border-border opacity-60" : "border-border focus-within:border-primary"}`}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.txt,.csv,.md,.json"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isTyping}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 disabled:opacity-40"
            aria-label="Upload image"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isTyping) handleSend();
              }}
              onPaste={(e) => {
                const items = e.clipboardData?.items;
                if (!items) return;
                for (const item of Array.from(items)) {
                  if (item.type.startsWith("image/")) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (file) handleFileRead(file);
                    return;
                  }
                }
              }}
              disabled={isTyping}
              placeholder={isRecording ? "Listening..." : pendingFile ? (pendingFile.isImage ? "Ask about this image..." : "Ask about this file...") : "Chalk it up..."}
              className={`w-full bg-transparent text-sm outline-none ${
                interimText ? "text-muted-foreground italic" : "text-foreground"
              } placeholder:text-muted-foreground ${
                !hasAnimatedPlaceholder ? "placeholder:animate-pulse-placeholder" : ""
              } disabled:cursor-not-allowed`}
              aria-label="Ask Mr. White a question"
              readOnly={isRecording}
              style={interimText ? { color: "transparent" } : {}}
            />
            {interimText && (
              <span className="absolute inset-0 flex items-center text-sm italic text-muted-foreground pointer-events-none truncate">
                {interimText}
              </span>
            )}
          </div>
          {/* Microphone button */}
          <button
            onClick={toggleRecording}
            disabled={isTyping}
            className={`relative p-1 transition-colors ${
              isRecording ? "text-destructive" : "text-muted-foreground hover:text-foreground"
            } disabled:opacity-40`}
            aria-label={isRecording ? "Stop recording" : "Voice input"}
          >
            {isProcessingSpeech ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <Mic size={18} />
                {isRecording && (
                  <span className="absolute inset-0 rounded-full border-2 border-destructive animate-mic-pulse" />
                )}
              </>
            )}
          </button>
          <button
            onClick={handleSend}
            disabled={(!input.trim() && !pendingFile) || isTyping}
            className="bg-primary text-primary-foreground rounded-full p-1.5 disabled:opacity-30 transition-opacity"
            aria-label="Send message"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        {/* Thinking indicator */}
        {isTyping && (
          <p className="text-[11px] text-muted-foreground/60 mt-1.5 px-2 animate-fade-in">Mr. White is thinking...</p>
        )}
        {/* Character count */}
        {input.length > 50 && !isTyping && (
          <p className="text-[11px] text-muted-foreground/40 mt-1 px-2">{input.length} characters</p>
        )}
        {/* Speech error */}
        {speechError && (
          <p className="text-xs text-muted-foreground mt-1 px-2">{speechError}</p>
        )}
      </div>
    </div>
  );
};

export default ChatPanel;
