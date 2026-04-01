import React, { useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { type MrWhiteState } from "../components/MrWhite";
import Whiteboard, { type WhiteboardElement } from "../components/Whiteboard";
import ChatPanel, { type ChatMessage } from "../components/ChatPanel";
import { toast } from "sonner";

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
  const [startTime] = useState(Date.now());
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const autoSentRef = useRef(false);

  const handleSend = useCallback(async (message: string, imageData?: string) => {
    // Add student message exactly as typed
    setMessages((prev) => [...prev, { role: "student", content: message, imagePreview: imageData }]);
    setMrWhiteState("thinking");
    setIsTyping(true);
    setIsStreaming(true);

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

      if (!resp.body) throw new Error("No response body");

      setIsTyping(false);
      setMrWhiteState("talking");

      // Stream the response
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullResponse = "";
      let streamDone = false;

      // Create the assistant message
      setMessages((prev) => [...prev, { role: "mr_white", content: "" }]);

      const updateLastMessage = (content: string) => {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "mr_white") {
            updated[updated.length - 1] = { ...last, content };
          }
          return updated;
        });
      };

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullResponse += content;
              // Try to extract the message field for live display
              const messageMatch = fullResponse.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"/);
              if (messageMatch) {
                // Unescape JSON string
                const displayText = messageMatch[1]
                  .replace(/\\n/g, "\n")
                  .replace(/\\"/g, '"')
                  .replace(/\\\\/g, "\\");
                updateLastMessage(displayText);
              } else {
                // Show raw streaming while building up
                // Try to get partial message content
                const partialMatch = fullResponse.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)/);
                if (partialMatch) {
                  const displayText = partialMatch[1]
                    .replace(/\\n/g, "\n")
                    .replace(/\\"/g, '"')
                    .replace(/\\\\/g, "\\");
                  updateLastMessage(displayText);
                }
              }
            }
          } catch {
            // Incomplete JSON, put back
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) fullResponse += content;
          } catch { /* ignore */ }
        }
      }

      // Parse the complete JSON response
      try {
        // Clean up potential markdown fences
        let cleaned = fullResponse.trim();
        if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
        if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
        if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
        cleaned = cleaned.trim();

        const aiResponse: AIResponse = JSON.parse(cleaned);

        // Final message update with clean text
        updateLastMessage(aiResponse.message);

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
      } catch (parseErr) {
        console.error("Failed to parse AI response:", parseErr, fullResponse);
        // If parsing fails, at least show what we streamed
        if (!fullResponse.trim()) {
          updateLastMessage("Hmm, I got a bit tangled up there. Could you ask that again?");
        }
        setQuickChips(defaultChips);
      }

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
      setIsStreaming(false);
      setIsTyping(false);
    }
  }, [messages, activeSubject]);

  const handleChipClick = useCallback(
    (chip: string) => {
      handleSend(chip);
    },
    [handleSend]
  );

  const sessionMinutes = Math.floor((Date.now() - startTime) / 60000);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Navbar />
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Left - Whiteboard Area (scrollable if content overflows) */}
        <div className="flex-[8] flex flex-col items-center p-6 overflow-y-auto min-h-0">
          {/* Subject pills */}
          <div className="flex flex-wrap gap-2 mb-6 flex-shrink-0">
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
          <Whiteboard whiteboardData={whiteboardData} mrWhiteState={mrWhiteState} className="flex-1 min-h-0" />
        </div>

        {/* Right - Chat Panel */}
        <div className="flex-[2] border-l border-border min-h-0 max-h-full">
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
