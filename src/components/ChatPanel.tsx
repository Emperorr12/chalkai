import React, { useState, useRef, useEffect, useCallback } from "react";
import MrWhite, { type MrWhiteState } from "./MrWhite";

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
  isTyping?: boolean;
  chalkedCount?: number;
  sessionMinutes?: number;
  className?: string;
  errorMessage?: string | null;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  mrWhiteState,
  quickChips,
  onSend,
  onChipClick,
  isTyping = false,
  chalkedCount = 0,
  sessionMinutes = 0,
  className = "",
  errorMessage = null,
}) => {
  const [input, setInput] = useState("");
  const [hasAnimatedPlaceholder, setHasAnimatedPlaceholder] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ data: string; name: string; type: string; isImage: boolean } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userScrolledRef = useRef(false);
  const dragCounterRef = useRef(0);

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
            <p className="text-sm font-medium text-primary">Drop image here</p>
            <p className="text-xs text-muted-foreground">Photos of problems, worksheets, textbooks</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <MrWhite state={mrWhiteState} size={40} />
        <div className="flex-1">
          <div className="text-sm font-medium text-foreground">Mr. White</div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Ready to teach
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {chalkedCount > 0 && (
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {chalkedCount} chalked up
            </span>
          )}
          {sessionMinutes > 0 && (
            <span>Studying for {sessionMinutes} min</span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex animate-fade-in-up ${
              msg.role === "student" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.role === "mr_white" && (
              <MrWhite state="idle" size={28} className="mr-2 mt-1 flex-shrink-0" />
            )}
            <div
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
              {msg.content}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start animate-fade-in-up">
            <MrWhite state="thinking" size={28} className="mr-2 mt-1 flex-shrink-0" />
            <div className="chalk-bubble flex gap-1.5 items-center">
              <span className="w-2 h-2 rounded-full bg-primary" style={{ animation: "dots-pulse 1.2s 0s infinite" }} />
              <span className="w-2 h-2 rounded-full bg-primary" style={{ animation: "dots-pulse 1.2s 0.2s infinite" }} />
              <span className="w-2 h-2 rounded-full bg-primary" style={{ animation: "dots-pulse 1.2s 0.4s infinite" }} />
            </div>
          </div>
        )}
      </div>

      {/* Pending image preview */}
      {pendingImage && (
        <div className="px-4 py-2 border-t border-border flex items-center gap-2 bg-muted/30">
          <img src={pendingImage} alt="Pending upload" className="h-12 w-12 object-cover rounded border border-border" />
          <span className="text-xs text-muted-foreground flex-1 truncate">{pendingImageName}</span>
          <button
            onClick={() => { setPendingImage(null); setPendingImageName(""); }}
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
        <div className="flex gap-2 px-4 py-2 overflow-x-auto flex-shrink-0">
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
            accept="image/*"
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
            placeholder={pendingImage ? "Ask about this image..." : "Chalk it up..."}
            className={`flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none ${
              !hasAnimatedPlaceholder ? "placeholder:animate-pulse-placeholder" : ""
            }`}
            aria-label="Ask Mr. White a question"
          />
          <button
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label="Voice input"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>
          <button
            onClick={handleSend}
            disabled={!input.trim() && !pendingImage}
            className="bg-primary text-primary-foreground rounded-full p-1.5 disabled:opacity-30 transition-opacity"
            aria-label="Send message"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
