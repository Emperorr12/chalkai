import React, { useState, useCallback, useEffect } from "react";
import Navbar from "../components/Navbar";
import MrWhite, { type MrWhiteState } from "../components/MrWhite";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { CalendarIcon, X, Plus, Clock, BookOpen, CheckCircle, AlertCircle, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { format, differenceInDays } from "date-fns";

const PLAN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-study-plan`;

interface Topic {
  name: string;
  confidence: number;
}

interface StudySession {
  topic: string;
  activity: string;
  duration_minutes: number;
  type: "learn" | "review" | "practice" | "quiz";
}

interface TodayPlan {
  totalMinutes: number;
  sessions: StudySession[];
  motivation: string;
}

interface PlanSummary {
  weak_topics: string[];
  strong_topics: string[];
  strategy: string;
}

interface StudyPlan {
  todayPlan: TodayPlan;
  summary: PlanSummary;
  dailyPlan: Array<{
    day: number;
    date: string;
    sessions: StudySession[];
    focus: string;
  }>;
}

const STORAGE_KEY = "chalk-exam-prep";

function loadSaved(): { subject: string; topics: Topic[]; examDate: string; plan: StudyPlan | null } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const sessionTypeConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  learn: { label: "Learn", color: "bg-primary/15 text-primary border-primary/30", icon: <BookOpen className="w-3.5 h-3.5" /> },
  review: { label: "Review", color: "bg-green-500/15 text-green-700 border-green-500/30", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  practice: { label: "Practice", color: "bg-amber-500/15 text-amber-700 border-amber-500/30", icon: <Sparkles className="w-3.5 h-3.5" /> },
  quiz: { label: "Quiz", color: "bg-destructive/15 text-destructive border-destructive/30", icon: <AlertCircle className="w-3.5 h-3.5" /> },
};

const ExamPrepPage: React.FC = () => {
  const saved = loadSaved();
  const [subject, setSubject] = useState(saved?.subject || "");
  const [topics, setTopics] = useState<Topic[]>(saved?.topics || []);
  const [topicInput, setTopicInput] = useState("");
  const [examDate, setExamDate] = useState<Date | undefined>(saved?.examDate ? new Date(saved.examDate) : undefined);
  const [plan, setPlan] = useState<StudyPlan | null>(saved?.plan || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mrWhiteState, setMrWhiteState] = useState<MrWhiteState>("idle");
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Persist state
  useEffect(() => {
    if (subject || topics.length > 0 || examDate) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        subject,
        topics,
        examDate: examDate?.toISOString(),
        plan,
      }));
    }
  }, [subject, topics, examDate, plan]);

  const addTopic = useCallback(() => {
    const trimmed = topicInput.trim();
    if (!trimmed) return;
    if (topics.find((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Topic already added");
      return;
    }
    setTopics((prev) => [...prev, { name: trimmed, confidence: 3 }]);
    setTopicInput("");
  }, [topicInput, topics]);

  const removeTopic = useCallback((name: string) => {
    setTopics((prev) => prev.filter((t) => t.name !== name));
  }, []);

  const updateConfidence = useCallback((name: string, confidence: number) => {
    setTopics((prev) => prev.map((t) => (t.name === name ? { ...t, confidence } : t)));
  }, []);

  const generatePlan = useCallback(async () => {
    if (!subject.trim()) { toast.error("Enter a subject"); return; }
    if (topics.length === 0) { toast.error("Add at least one topic"); return; }
    if (!examDate) { toast.error("Select an exam date"); return; }
    if (examDate <= new Date()) { toast.error("Exam date must be in the future"); return; }

    setIsGenerating(true);
    setMrWhiteState("thinking");

    try {
      const resp = await fetch(PLAN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          subject: subject.trim(),
          topics,
          examDate: examDate.toISOString().split("T")[0],
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: `Error ${resp.status}` }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      const data: StudyPlan = await resp.json();
      setPlan(data);
      setMrWhiteState("excited");
      setTimeout(() => setMrWhiteState("idle"), 3000);
      toast.success("Study plan generated!");
    } catch (err) {
      console.error("Plan generation error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to generate plan");
      setMrWhiteState("idle");
    } finally {
      setIsGenerating(false);
    }
  }, [subject, topics, examDate]);

  const daysLeft = examDate ? Math.max(0, differenceInDays(examDate, new Date())) : null;
  const weakTopics = plan?.summary?.weak_topics || [];
  const strongTopics = plan?.summary?.strong_topics || [];
  const showDashboard = plan !== null;

  const confidenceLabel = (c: number) => {
    if (c <= 1) return "Lost";
    if (c <= 2) return "Shaky";
    if (c <= 3) return "Okay";
    if (c <= 4) return "Good";
    return "Solid";
  };

  const confidenceColor = (c: number) => {
    if (c <= 2) return "text-destructive";
    if (c <= 3) return "text-amber-600";
    return "text-green-600";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <MrWhite state={mrWhiteState} size={56} />
          <div>
            <h1 className="text-2xl font-light text-foreground">Exam Prep</h1>
            <p className="text-sm text-muted-foreground">
              {showDashboard
                ? "Your personalized study plan is ready"
                : "Tell me about your exam and I'll build your study plan"}
            </p>
          </div>
        </div>

        {/* Setup Form */}
        <div className={`${showDashboard ? "mb-10" : ""}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Subject */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Biology, Economics..."
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Exam Date */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Exam Date</label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <button className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card text-sm text-left hover:border-primary transition-colors">
                    <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                    {examDate ? (
                      <span className="text-foreground">{format(examDate, "PPP")}</span>
                    ) : (
                      <span className="text-muted-foreground">Pick a date</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={examDate}
                    onSelect={(d) => { setExamDate(d); setCalendarOpen(false); }}
                    disabled={(d) => d <= new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Generate */}
            <div className="flex items-end">
              <Button
                onClick={generatePlan}
                disabled={isGenerating}
                className="w-full rounded-lg h-[42px]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : plan ? (
                  "Regenerate Plan"
                ) : (
                  "Generate Study Plan"
                )}
              </Button>
            </div>
          </div>

          {/* Topics */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
              Topics & Confidence
            </label>

            {/* Topic input */}
            <div className="flex gap-2 mb-3">
              <input
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTopic()}
                placeholder="Add a topic (press Enter)"
                className="flex-1 px-4 py-2 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
              <Button variant="outline" size="icon" onClick={addTopic} className="rounded-lg shrink-0">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Topic tags with sliders */}
            {topics.length > 0 ? (
              <div className="space-y-3">
                {topics.map((topic) => (
                  <div
                    key={topic.name}
                    className="flex items-center gap-4 px-4 py-3 rounded-lg border border-border bg-card"
                  >
                    <button
                      onClick={() => removeTopic(topic.name)}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm text-foreground min-w-[120px]">{topic.name}</span>
                    <div className="flex-1 max-w-[200px]">
                      <Slider
                        value={[topic.confidence]}
                        onValueChange={([v]) => updateConfidence(topic.name, v)}
                        min={1}
                        max={5}
                        step={1}
                      />
                    </div>
                    <span className={`text-xs font-medium min-w-[40px] ${confidenceColor(topic.confidence)}`}>
                      {confidenceLabel(topic.confidence)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2">No topics added yet. Add the specific topics your exam covers.</p>
            )}
          </div>
        </div>

        {/* Dashboard */}
        {showDashboard && (
          <div className="animate-fade-in-up">
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard
                label="Days Until Exam"
                value={daysLeft !== null ? String(daysLeft) : "—"}
                accent={daysLeft !== null && daysLeft <= 3}
              />
              <StatCard
                label="Topics Mastered"
                value={String(strongTopics.length)}
                subtitle={`of ${topics.length}`}
              />
              <StatCard
                label="Need Review"
                value={String(weakTopics.length)}
                accent={weakTopics.length > 0}
              />
              <StatCard
                label="Today's Study"
                value={`${plan.todayPlan?.totalMinutes || 0}m`}
                subtitle="estimated"
              />
            </div>

            {/* Strategy */}
            {plan.summary?.strategy && (
              <div className="chalk-bubble mb-6">
                <div className="flex items-start gap-3">
                  <MrWhite state="talking" size={32} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-foreground leading-relaxed">{plan.summary.strategy}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Topic status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {weakTopics.length > 0 && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                  <h3 className="text-xs font-medium text-destructive uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Needs Work
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {weakTopics.map((t) => (
                      <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {strongTopics.length > 0 && (
                <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
                  <h3 className="text-xs font-medium text-green-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Looking Good
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {strongTopics.map((t) => (
                      <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-green-500/10 text-green-700 border border-green-500/20">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Today's plan */}
            {plan.todayPlan && (
              <div className="mb-8">
                <h2 className="text-lg font-light text-foreground mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Today's Study Plan
                </h2>

                {plan.todayPlan.motivation && (
                  <p className="text-sm text-muted-foreground mb-4 italic">"{plan.todayPlan.motivation}"</p>
                )}

                <div className="space-y-3">
                  {plan.todayPlan.sessions.map((session, i) => {
                    const cfg = sessionTypeConfig[session.type] || sessionTypeConfig.learn;
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-4 px-4 py-3 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors"
                      >
                        <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${cfg.color}`}>
                          {cfg.icon}
                          {cfg.label}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground">{session.topic}</div>
                          <div className="text-xs text-muted-foreground truncate">{session.activity}</div>
                        </div>
                        <div className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {session.duration_minutes}m
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Full schedule preview */}
            {plan.dailyPlan && plan.dailyPlan.length > 0 && (
              <div>
                <h2 className="text-lg font-light text-foreground mb-4">Full Schedule</h2>
                <div className="space-y-2">
                  {plan.dailyPlan.slice(0, 14).map((day) => (
                    <details key={day.day} className="group rounded-lg border border-border bg-card">
                      <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer text-sm hover:bg-accent/30 transition-colors rounded-lg">
                        <span className="text-xs text-muted-foreground min-w-[60px]">Day {day.day}</span>
                        <span className="text-foreground font-medium flex-1">{day.focus}</span>
                        <span className="text-xs text-muted-foreground">
                          {day.sessions?.reduce((a, s) => a + s.duration_minutes, 0) || 0}m
                        </span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-open:rotate-90 transition-transform" />
                      </summary>
                      <div className="px-4 pb-3 space-y-2 border-t border-border/50 pt-3">
                        {day.sessions?.map((s, j) => {
                          const cfg = sessionTypeConfig[s.type] || sessionTypeConfig.learn;
                          return (
                            <div key={j} className="flex items-center gap-3 text-xs">
                              <span className={`px-1.5 py-0.5 rounded border ${cfg.color}`}>{cfg.label}</span>
                              <span className="text-foreground">{s.topic}</span>
                              <span className="text-muted-foreground">— {s.activity}</span>
                              <span className="ml-auto text-muted-foreground">{s.duration_minutes}m</span>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  ))}
                  {plan.dailyPlan.length > 14 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      + {plan.dailyPlan.length - 14} more days
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

function StatCard({ label, value, subtitle, accent }: { label: string; value: string; subtitle?: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 text-center ${accent ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"}`}>
      <div className={`text-2xl font-light ${accent ? "text-destructive" : "text-foreground"}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
      {subtitle && <div className="text-xs text-muted-foreground/60">{subtitle}</div>}
    </div>
  );
}

export default ExamPrepPage;
