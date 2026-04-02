import React, { useMemo } from "react";
import Navbar from "../components/Navbar";
import { useLearningProfile } from "@/hooks/useLearningProfile";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { BookOpen, Trophy, AlertTriangle, Flame, Clock, Target } from "lucide-react";

const STREAK_COLORS = {
  0: "bg-muted",
  1: "bg-primary/20",
  2: "bg-primary/40",
  3: "bg-primary/60",
  4: "bg-primary/80",
  5: "bg-primary",
};

function getStreakColor(minutes: number) {
  if (minutes === 0) return STREAK_COLORS[0];
  if (minutes < 10) return STREAK_COLORS[1];
  if (minutes < 20) return STREAK_COLORS[2];
  if (minutes < 40) return STREAK_COLORS[3];
  if (minutes < 60) return STREAK_COLORS[4];
  return STREAK_COLORS[5];
}

function getLast12Weeks() {
  const days: string[] = [];
  const today = new Date();
  // Start from 83 days ago (12 weeks - 1 day)
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

const ProgressPage: React.FC = () => {
  const { user } = useAuth();
  const { topics, sessions, loading } = useLearningProfile();

  // Subjects studied with session counts
  const subjectStats = useMemo(() => {
    const map: Record<string, { sessions: number; lastStudied: string }> = {};
    for (const t of topics) {
      if (!map[t.subject]) {
        map[t.subject] = { sessions: 0, lastStudied: t.last_reviewed };
      }
      map[t.subject].sessions += t.times_covered;
      if (t.last_reviewed > map[t.subject].lastStudied) {
        map[t.subject].lastStudied = t.last_reviewed;
      }
    }
    return Object.entries(map)
      .sort((a, b) => b[1].sessions - a[1].sessions)
      .map(([subject, data]) => ({ subject, ...data }));
  }, [topics]);

  // Mastered concepts
  const mastered = useMemo(
    () => topics.filter((t) => t.mastered).map((t) => t.topic),
    [topics]
  );

  // Weak areas
  const weakAreas = useMemo(
    () =>
      topics
        .filter((t) => t.times_simplified >= 2)
        .sort((a, b) => b.times_simplified - a.times_simplified)
        .map((t) => ({ topic: t.topic, timesSimplified: t.times_simplified })),
    [topics]
  );

  // Quiz accuracy per subject
  const quizData = useMemo(() => {
    const map: Record<string, { correct: number; total: number }> = {};
    for (const t of topics) {
      if (t.quiz_total > 0) {
        if (!map[t.subject]) map[t.subject] = { correct: 0, total: 0 };
        map[t.subject].correct += t.quiz_correct;
        map[t.subject].total += t.quiz_total;
      }
    }
    return Object.entries(map).map(([subject, d]) => ({
      subject,
      accuracy: Math.round((d.correct / d.total) * 100),
      correct: d.correct,
      total: d.total,
    }));
  }, [topics]);

  // Streak calendar data
  const calendarDays = useMemo(() => {
    const days = getLast12Weeks();
    const sessionMap: Record<string, number> = {};
    for (const s of sessions) {
      sessionMap[s.session_date] = (sessionMap[s.session_date] || 0) + s.duration_minutes;
    }
    return days.map((date) => ({
      date,
      minutes: sessionMap[date] || 0,
    }));
  }, [sessions]);

  // Current streak
  const currentStreak = useMemo(() => {
    if (sessions.length === 0) return 0;
    return sessions[0].streak_days;
  }, [sessions]);

  // Total study time
  const totalMinutes = useMemo(
    () => sessions.reduce((sum, s) => sum + s.duration_minutes, 0),
    [sessions]
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <h1 className="text-2xl font-medium text-foreground mb-4">My Progress</h1>
          <p className="text-muted-foreground mb-6">Sign in to track your learning journey.</p>
          <Link
            to="/auth"
            className="inline-block px-6 py-2 rounded-full border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-4xl mx-auto px-6 py-20 text-center text-muted-foreground">
          Loading your progress...
        </div>
      </div>
    );
  }

  const hasData = topics.length > 0 || sessions.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-medium text-foreground mb-8">My Progress</h1>

        {!hasData ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">No learning data yet. Start asking Mr. White questions!</p>
            <Link
              to="/ask"
              className="inline-block px-6 py-2 rounded-full border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              Start learning
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Stats overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard icon={<BookOpen className="w-4 h-4" />} label="Topics covered" value={topics.length} />
              <StatCard icon={<Trophy className="w-4 h-4" />} label="Mastered" value={mastered.length} />
              <StatCard icon={<Flame className="w-4 h-4" />} label="Day streak" value={currentStreak} />
              <StatCard
                icon={<Clock className="w-4 h-4" />}
                label="Study time"
                value={totalMinutes < 60 ? `${totalMinutes}m` : `${Math.round(totalMinutes / 60)}h`}
              />
            </div>

            {/* Subjects studied */}
            {subjectStats.length > 0 && (
              <Section title="Subjects Studied" icon={<BookOpen className="w-4 h-4" />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {subjectStats.map((s) => (
                    <div key={s.subject} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/50">
                      <span className="text-sm font-medium text-foreground">{s.subject}</span>
                      <span className="text-xs text-muted-foreground">{s.sessions} session{s.sessions !== 1 ? "s" : ""}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Mastered concepts */}
            {mastered.length > 0 && (
              <Section title="Concepts Mastered" icon={<Trophy className="w-4 h-4" />}>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {mastered.map((concept) => (
                    <span
                      key={concept}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                    >
                      ✓ {concept}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {/* Weak areas */}
            {weakAreas.length > 0 && (
              <Section title="Areas to Review" icon={<AlertTriangle className="w-4 h-4" />}>
                <div className="space-y-2">
                  {weakAreas.map((w) => (
                    <div key={w.topic} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/50">
                      <span className="text-sm text-foreground">{w.topic}</span>
                      <span className="text-xs text-muted-foreground">
                        Simplified {w.timesSimplified}×
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Quiz accuracy chart */}
            {quizData.length > 0 && (
              <Section title="Quiz Accuracy" icon={<Target className="w-4 h-4" />}>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={quizData} barSize={32}>
                      <XAxis dataKey="subject" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} unit="%" />
                      <Tooltip
                        formatter={(value: number, _name: string, props: any) => [
                          `${props.payload.correct}/${props.payload.total} (${value}%)`,
                          "Accuracy",
                        ]}
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="accuracy" radius={[6, 6, 0, 0]}>
                        {quizData.map((_, i) => (
                          <Cell key={i} fill="hsl(var(--primary))" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Section>
            )}

            {/* Streak calendar */}
            <Section title="Study Streak" icon={<Flame className="w-4 h-4" />}>
              <div className="flex flex-col gap-1">
                <div className="grid grid-cols-[repeat(12,1fr)] gap-1">
                  {/* Split into 12 weeks of 7 days */}
                  {Array.from({ length: 12 }, (_, weekIdx) => (
                    <div key={weekIdx} className="flex flex-col gap-1">
                      {calendarDays.slice(weekIdx * 7, weekIdx * 7 + 7).map((day) => (
                        <div
                          key={day.date}
                          className={`w-full aspect-square rounded-sm ${getStreakColor(day.minutes)}`}
                          title={`${day.date}: ${day.minutes}m`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <span>Less</span>
                  {Object.values(STREAK_COLORS).map((color, i) => (
                    <div key={i} className={`w-3 h-3 rounded-sm ${color}`} />
                  ))}
                  <span>More</span>
                </div>
              </div>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
};

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="p-4 rounded-lg bg-card border border-border/50 text-center">
      <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-2xl font-medium text-foreground">{value}</div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

export default ProgressPage;
