import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Whiteboard, { type WhiteboardData } from "@/components/Whiteboard";
import { type MrWhiteState } from "@/components/MrWhite";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useLessons, type Lesson } from "@/hooks/useLessons";
import { History, Play, Trash2 } from "lucide-react";

const Lessons: React.FC = () => {
  const { lessons, deleteLesson, clearLessons } = useLessons();
  const { speak } = useTextToSpeech();
  const [replayingId, setReplayingId] = useState<number | null>(null);
  const [whiteboardData, setWhiteboardData] = useState<WhiteboardData | null>(null);
  const [mrWhiteState, setMrWhiteState] = useState<MrWhiteState>("idle");

  const handleReplay = (lesson: Lesson) => {
    setReplayingId(lesson.id);
    setWhiteboardData(null);

    // Small delay to reset whiteboard then re-draw
    setTimeout(() => {
      setMrWhiteState("talking");
      speak(
        lesson.audio_text,
        () => setMrWhiteState("talking"),
        () => {
          // After voice, draw whiteboard
          const wbData = resolveWhiteboardData(lesson.whiteboard);
          if (wbData && wbData.elements.length > 0) {
            setWhiteboardData(wbData);
            setMrWhiteState("drawing");
            const dur = (wbData.elements.length || 1) * 800;
            setTimeout(() => {
              setMrWhiteState("idle");
              setReplayingId(null);
            }, dur);
          } else {
            setMrWhiteState("idle");
            setReplayingId(null);
          }
        },
      );
    }, 100);
  };

  const sorted = [...lessons].reverse();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <History className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">My Lessons</h1>
            <span className="text-sm text-muted-foreground">({lessons.length})</span>
          </div>
          {lessons.length > 0 && (
            <button
              onClick={clearLessons}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Replay whiteboard area */}
        {replayingId && (
          <div className="mb-8">
            <Whiteboard
              whiteboardData={whiteboardData}
              mrWhiteState={mrWhiteState}
              className="w-full min-h-[260px]"
            />
          </div>
        )}

        {sorted.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">No lessons yet</p>
            <p className="text-sm mt-1">Ask Mr. White a question and your lessons will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((lesson) => (
              <div
                key={lesson.id}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${
                  replayingId === lesson.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] px-2 py-0.5 rounded-full border border-border text-primary font-medium">
                      {lesson.subject}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(lesson.timestamp).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{lesson.question}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{lesson.message}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleReplay(lesson)}
                    disabled={replayingId !== null}
                    className="p-2 rounded-lg border border-border text-primary hover:bg-primary/10 transition-colors disabled:opacity-40"
                    title="Replay lesson"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteLesson(lesson.id)}
                    className="p-2 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
                    title="Delete lesson"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Lessons;
