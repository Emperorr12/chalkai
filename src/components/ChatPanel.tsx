import React, { useState, useRef, useEffect } from "react";
import MrWhite, { type MrWhiteState } from "./MrWhite";

export interface ChatMessage {
  role: "mr_white" | "student";
  content: string;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  mrWhiteState: MrWhiteState;
  quickChips: string[];
  onSend: (message: string) => void;
  onChipClick: (chip: string) => void;
  isTyping?: boolean;
  chalkedCount?: number;
  sessionMinutes?: number;
  className?: string;
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
}) => {
  const [input, setInput] = useState("");
  const [hasAnimatedPlaceholder, setHasAnimatedPlaceholder] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const userScrolledRef = useRef(false);

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

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput("");
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    userScrolledRef.current = scrollHeight - scrollTop - clientHeight > 60;
  };

  return (
    <div className={`flex flex-col h-full bg-background ${className}`}>
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

      {/* Input */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2 bg-card rounded-full px-4 py-2 border border-border focus-within:border-primary transition-colors">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Chalk it up..."
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
            disabled={!input.trim()}
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
