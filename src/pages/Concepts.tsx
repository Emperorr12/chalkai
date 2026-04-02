import React, { useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedConcepts, type SavedConcept } from "@/hooks/useSavedConcepts";
import { BookOpen, CheckCircle2, Trash2, ChevronLeft, ChevronRight, RotateCcw, Sparkles } from "lucide-react";

const subjects = ["All", "Math", "Science", "History", "Economics", "Coding", "English", "Other"];

const ConceptCard: React.FC<{
  concept: SavedConcept;
  onToggleMastered: () => void;
  onDelete: () => void;
  onReview: () => void;
}> = ({ concept, onToggleMastered, onDelete, onReview }) => (
  <div className={`border rounded-lg p-4 transition-colors ${concept.mastered ? "border-green-300 bg-green-50/50" : "border-border bg-card"}`}>
    <div className="flex items-start justify-between gap-2 mb-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground">{concept.subject}</span>
          {concept.topic && <span className="text-xs text-muted-foreground truncate">{concept.topic}</span>}
          {concept.mastered && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
        </div>
        <p className="text-sm font-medium text-foreground line-clamp-2">{concept.question}</p>
      </div>
    </div>
    <p className="text-xs text-muted-foreground line-clamp-3 mb-3">{concept.explanation}</p>
    <div className="flex items-center gap-2">
      <button onClick={onReview} className="text-xs px-3 py-1.5 rounded-full border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
        Review
      </button>
      <button
        onClick={onToggleMastered}
        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${concept.mastered ? "border-green-400 text-green-600 hover:bg-green-100" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}
      >
        {concept.mastered ? "Mastered ✓" : "Mark mastered"}
      </button>
      <button onClick={onDelete} className="ml-auto p-1.5 text-muted-foreground hover:text-destructive transition-colors" aria-label="Delete">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
    <div className="text-[10px] text-muted-foreground mt-2">
      {new Date(concept.created_at).toLocaleDateString()}
    </div>
  </div>
);

const FlashcardReview: React.FC<{
  concepts: SavedConcept[];
  onExit: () => void;
  onToggleMastered: (id: string, mastered: boolean) => void;
}> = ({ concepts, onExit, onToggleMastered }) => {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const current = concepts[index];

  if (!current) return null;

  return (
    <div className="flex flex-col items-center justify-center flex-1 min-h-0 p-4">
      <div className="text-sm text-muted-foreground mb-4">
        {index + 1} / {concepts.length}
      </div>

      <button
        onClick={() => setFlipped((f) => !f)}
        className="w-full max-w-lg min-h-[280px] border border-border rounded-xl p-6 bg-card shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-center"
      >
        {!flipped ? (
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-3 flex items-center justify-center gap-1">
              <BookOpen className="w-3.5 h-3.5" /> Question
            </div>
            <p className="text-lg font-medium text-foreground" style={{ fontFamily: "'Caveat', cursive" }}>
              {current.question}
            </p>
            <p className="text-xs text-muted-foreground mt-4">Tap to reveal answer</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-3 flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Explanation
            </div>
            <p className="text-sm text-foreground leading-relaxed">{current.explanation}</p>
          </div>
        )}
      </button>

      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={() => { setIndex((i) => Math.max(0, i - 1)); setFlipped(false); }}
          disabled={index === 0}
          className="p-2 rounded-full border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => { onToggleMastered(current.id, !current.mastered); }}
          className={`text-xs px-4 py-2 rounded-full border transition-colors ${current.mastered ? "border-green-400 text-green-600" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}
        >
          {current.mastered ? "Mastered ✓" : "Mark mastered"}
        </button>
        <button
          onClick={() => { setIndex((i) => Math.min(concepts.length - 1, i + 1)); setFlipped(false); }}
          disabled={index === concepts.length - 1}
          className="p-2 rounded-full border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <button onClick={onExit} className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
        <RotateCcw className="w-3 h-3" /> Back to list
      </button>
    </div>
  );
};

const ConceptsPage: React.FC = () => {
  const { user } = useAuth();
  const { concepts, isLoading, toggleMastered, deleteConcept } = useSavedConcepts();
  const [filter, setFilter] = useState("All");
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);

  const filtered = useMemo(() => {
    if (filter === "All") return concepts;
    return concepts.filter((c) => c.subject === filter);
  }, [concepts, filter]);

  const reviewable = useMemo(() => filtered.filter((c) => !c.mastered), [filtered]);

  if (!user) return <Navigate to="/auth" replace />;

  if (reviewMode) {
    const reviewList = reviewIndex !== null ? [filtered[reviewIndex]] : reviewable.length > 0 ? reviewable : filtered;
    return (
      <div className="h-screen bg-background flex flex-col">
        <Navbar />
        <FlashcardReview
          concepts={reviewList}
          onExit={() => { setReviewMode(false); setReviewIndex(null); }}
          onToggleMastered={(id, mastered) => toggleMastered({ id, mastered })}
        />
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold text-foreground">My Concepts</h1>
              <p className="text-sm text-muted-foreground">{concepts.length} saved · {concepts.filter((c) => c.mastered).length} mastered</p>
            </div>
            {reviewable.length > 0 && (
              <button
                onClick={() => setReviewMode(true)}
                className="text-sm px-4 py-2 rounded-full border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors flex items-center gap-1.5"
              >
                <BookOpen className="w-4 h-4" /> Review ({reviewable.length})
              </button>
            )}
          </div>

          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
            {subjects.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap ${filter === s ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}
              >
                {s}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">No saved concepts yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Ask Mr. White a question, then hit "Save" to keep it here.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((c, i) => (
                <ConceptCard
                  key={c.id}
                  concept={c}
                  onToggleMastered={() => toggleMastered({ id: c.id, mastered: !c.mastered })}
                  onDelete={() => deleteConcept(c.id)}
                  onReview={() => { setReviewIndex(i); setReviewMode(true); }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConceptsPage;
