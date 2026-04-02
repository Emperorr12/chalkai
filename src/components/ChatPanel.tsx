import React, { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Loader2, Bookmark, RotateCcw } from "lucide-react";
import { type MrWhiteState } from "./MrWhite";
import HighlightAskTooltip from "./HighlightAskTooltip";

export interface ChatMessage {
  role: "mr_white" | "student";
  content: string;
  imagePreview?: string;
  fileName?: string;
  fileType?: string;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  mrWhiteState: MrWhiteState;
  quickChips: string[];
  onSend: (message: string, fileData?: { data: string; type: string; name: string }) => void;
  onChipClick: (chip: string) => void;
  onSaveConcept?: (question: string, explanation: string) => void;
  isTyping?: boolean;
  chalkedCount?: number;
  sessionMinutes?: number;
  className?: string;
  errorMessage?: string | null;
  onListeningChange?: (listening: boolean) => void;
  savedConceptQuestions?: Set<string>;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  mrWhiteState,
  quickChips,
  onSend,
  onChipClick,
  onSaveConcept,
  isTyping = false,
  chalkedCount = 0,
  sessionMinutes = 0,
  className = "",
  errorMessage = null,
  onListeningChange,
  savedConceptQuestions,
}) => {
  const [input, setInput] = useState("");
  const [hasAnimatedPlaceholder, setHasAnimatedPlaceholder] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ data: string; name: string; type: string; isImage: boolean } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingSpeech, setIsProcessingSpeech] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [interimText, setInterimText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userScrolledRef = useRef(false);
  const dragCounterRef = useRef(0);
  const recognitionRef = useRef<any>(null);
  const autoSubmitTimerRef = useRef<number | null>(null);

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

  const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const SUPPORTED_DOC_TYPES = ["application/pdf", "text/plain", "text/csv", "text/markdown", "application/json"];
  const ALL_SUPPORTED = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_DOC_TYPES];

  const handleFileRead = useCallback((file: File) => {
    const isImage = SUPPORTED_IMAGE_TYPES.includes(file.type);
    const isDoc = SUPPORTED_DOC_TYPES.includes(file.type);
    
    if (!isImage && !isDoc) {
      // Try by extension
      const ext = file.name.split('.').pop()?.toLowerCase();
      const extMap: Record<string, boolean> = { pdf: true, txt: true, csv: true, md: true, json: true };
      if (!ext || !extMap[ext]) return;
    }
    
    if (file.size > 20 * 1024 * 1024) return; // 20MB limit

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
    if (!trimmed && !pendingFile) return;
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

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
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
    if (files.length > 0) {
      handleFileRead(files[0]);
    }
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

      // Reset auto-submit timer on new speech
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
      // If we have final text and no auto-submit fired yet, submit
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
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
    };
  }, []);

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

      {/* Header — compact transcript label */}
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
          {sessionMinutes > 0 && (
            <span>{sessionMinutes} min</span>
          )}
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
        {messages.map((msg, i) => {
          // Find the student question that precedes this mr_white answer
          const prevStudentMsg = msg.role === "mr_white" && i > 0
            ? messages.slice(0, i).reverse().find((m) => m.role === "student")
            : null;
          const isSaved = prevStudentMsg && savedConceptQuestions?.has(prevStudentMsg.content);
          const canSave = msg.role === "mr_white" && prevStudentMsg && onSaveConcept && i > 0;

          return (
            <div key={i}>
              <div
                className={`flex animate-fade-in-up ${
                  msg.role === "student" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "mr_white" && (
                  <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0 text-[10px] text-primary font-bold">W</span>
                )}
                <div
                  {...(msg.role === "mr_white" ? { "data-mr-white-msg": true } : {})}
                  className={`max-w-[80%] text-sm leading-relaxed ${
                    msg.role === "student"
                      ? "student-bubble"
                      : "chalk-bubble"
                  }`}
                >
                  {msg.imagePreview && (
                    <img
                      src={msg.imagePreview}
                      alt="Uploaded problem"
                      className="max-w-full max-h-48 rounded-md mb-2 border border-border"
                    />
                  )}
                  {msg.fileName && !msg.imagePreview && (
                    <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-background/30 rounded border border-border/50 text-xs">
                      <span className="font-medium">{msg.fileName.split('.').pop()?.toUpperCase()}</span>
                      <span className="truncate opacity-70">{msg.fileName}</span>
                    </div>
                  )}
                  {msg.content}
                </div>
              </div>
              {canSave && (
                <div className="ml-9 mt-1 mb-1">
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
                </div>
              )}
            </div>
          );
        })}

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
          <button
            onClick={() => setPendingFile(null)}
            className="text-muted-foreground hover:text-foreground p-1"
            aria-label="Remove attachment"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Quick chips */}
      {quickChips.length > 0 && (
        <div
          key={quickChips.join(",")}
          className="flex gap-2 px-4 py-2 overflow-x-auto flex-shrink-0"
          style={{ animation: "fade-in 0.2s ease-out" }}
        >
          {quickChips.map((chip) => (
            <button
              key={chip}
              onClick={() => onChipClick(chip)}
              className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors whitespace-nowrap flex-shrink-0"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Error message */}
      {errorMessage && (
        <div className="px-4 py-2 text-xs text-destructive bg-destructive/10 border-t border-destructive/20">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2 bg-card rounded-full px-4 py-2 border border-border focus-within:border-primary transition-colors">
          {/* File upload button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.txt,.csv,.md,.json"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
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
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
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
              placeholder={isRecording ? "Listening..." : pendingFile ? (pendingFile.isImage ? "Ask about this image..." : "Ask about this file...") : "Chalk it up..."}
              className={`w-full bg-transparent text-sm outline-none ${
                interimText ? "text-muted-foreground italic" : "text-foreground"
              } placeholder:text-muted-foreground ${
                !hasAnimatedPlaceholder ? "placeholder:animate-pulse-placeholder" : ""
              }`}
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
            className={`relative p-1 transition-colors ${
              isRecording
                ? "text-destructive"
                : "text-muted-foreground hover:text-foreground"
            }`}
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
            disabled={!input.trim() && !pendingFile}
            className="bg-primary text-primary-foreground rounded-full p-1.5 disabled:opacity-30 transition-opacity"
            aria-label="Send message"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        {/* Speech error */}
        {speechError && (
          <p className="text-xs text-muted-foreground mt-1 px-2">{speechError}</p>
        )}
      </div>
    </div>
  );
};

export default ChatPanel;
