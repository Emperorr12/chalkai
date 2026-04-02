import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface LearningTopic {
  id: string;
  topic: string;
  subject: string;
  times_covered: number;
  quiz_correct: number;
  quiz_total: number;
  times_simplified: number;
  mastered: boolean;
  last_reviewed: string;
}

interface StudySession {
  session_date: string;
  duration_minutes: number;
  streak_days: number;
}

export function useLearningProfile() {
  const { user } = useAuth();
  const [topics, setTopics] = useState<LearningTopic[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all learning data
  const fetchProfile = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const [topicsRes, sessionsRes] = await Promise.all([
      supabase.from("learning_data").select("*").eq("user_id", user.id).order("last_reviewed", { ascending: false }),
      supabase.from("study_sessions").select("*").eq("user_id", user.id).order("session_date", { ascending: false }).limit(30),
    ]);
    if (topicsRes.data) setTopics(topicsRes.data);
    if (sessionsRes.data) setSessions(sessionsRes.data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // Track a topic interaction
  const trackTopic = useCallback(async (topic: string, subject: string) => {
    if (!user) return;
    const existing = topics.find((t) => t.topic === topic && t.subject === subject);
    if (existing) {
      await supabase.from("learning_data").update({
        times_covered: existing.times_covered + 1,
        last_reviewed: new Date().toISOString(),
      }).eq("id", existing.id);
    } else {
      await supabase.from("learning_data").insert({
        user_id: user.id,
        topic,
        subject,
        times_covered: 1,
      });
    }
    fetchProfile();
  }, [user, topics, fetchProfile]);

  // Track simplification request
  const trackSimplification = useCallback(async (topic: string, subject: string) => {
    if (!user) return;
    const existing = topics.find((t) => t.topic === topic && t.subject === subject);
    if (existing) {
      await supabase.from("learning_data").update({
        times_simplified: existing.times_simplified + 1,
      }).eq("id", existing.id);
    } else {
      await supabase.from("learning_data").insert({
        user_id: user.id,
        topic,
        subject,
        times_simplified: 1,
      });
    }
    fetchProfile();
  }, [user, topics, fetchProfile]);

  // Track quiz result
  const trackQuiz = useCallback(async (topic: string, subject: string, correct: number, total: number) => {
    if (!user) return;
    const existing = topics.find((t) => t.topic === topic && t.subject === subject);
    if (existing) {
      await supabase.from("learning_data").update({
        quiz_correct: existing.quiz_correct + correct,
        quiz_total: existing.quiz_total + total,
      }).eq("id", existing.id);
    } else {
      await supabase.from("learning_data").insert({
        user_id: user.id,
        topic,
        subject,
        quiz_correct: correct,
        quiz_total: total,
      });
    }
    fetchProfile();
  }, [user, topics, fetchProfile]);

  // Mark topic as mastered
  const markMastered = useCallback(async (topic: string, subject: string) => {
    if (!user) return;
    const existing = topics.find((t) => t.topic === topic && t.subject === subject);
    if (existing) {
      await supabase.from("learning_data").update({ mastered: true }).eq("id", existing.id);
      fetchProfile();
    }
  }, [user, topics, fetchProfile]);

  // Track study session time
  const trackSession = useCallback(async (durationMinutes: number) => {
    if (!user || durationMinutes < 1) return;
    const today = new Date().toISOString().split("T")[0];
    const todaySession = sessions.find((s) => s.session_date === today);

    // Calculate streak
    let streak = 1;
    if (sessions.length > 0) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      const hadYesterday = sessions.find((s) => s.session_date === yesterdayStr);
      if (hadYesterday) streak = hadYesterday.streak_days + 1;
    }

    if (todaySession) {
      await supabase.from("study_sessions").update({
        duration_minutes: (todaySession.duration_minutes || 0) + durationMinutes,
        streak_days: streak,
      }).eq("user_id", user.id).eq("session_date", today);
    } else {
      await supabase.from("study_sessions").insert({
        user_id: user.id,
        session_date: today,
        duration_minutes: durationMinutes,
        streak_days: streak,
      });
    }
    fetchProfile();
  }, [user, sessions, fetchProfile]);

  // Build profile summary string for Mr. White
  const getProfileSummary = useCallback((): string => {
    if (topics.length === 0) return "";

    const parts: string[] = [];
    const strong = topics.filter((t) => t.mastered || (t.quiz_total > 0 && t.quiz_correct / t.quiz_total >= 0.8));
    const weak = topics.filter((t) => t.times_simplified >= 3);
    const stale = topics.filter((t) => {
      const daysSince = Math.floor((Date.now() - new Date(t.last_reviewed).getTime()) / 86400000);
      return daysSince >= 7 && !t.mastered;
    });

    if (strong.length > 0) {
      parts.push(`Strong in ${strong.map((t) => t.topic).join(", ")}`);
    }

    for (const t of weak) {
      parts.push(`struggling with ${t.topic} (asked for simpler ${t.times_simplified} times)`);
    }

    for (const t of stale) {
      const days = Math.floor((Date.now() - new Date(t.last_reviewed).getTime()) / 86400000);
      parts.push(`hasn't reviewed ${t.topic} in ${days} days`);
    }

    // Quiz performance for medium topics
    const medium = topics.filter((t) => t.quiz_total > 0 && !strong.includes(t) && !weak.includes(t));
    for (const t of medium) {
      const pct = Math.round((t.quiz_correct / t.quiz_total) * 100);
      parts.push(`${t.topic} quiz accuracy: ${pct}%`);
    }

    // Streak
    const currentStreak = sessions.length > 0 ? sessions[0].streak_days : 0;
    if (currentStreak > 1) parts.push(`${currentStreak}-day study streak`);

    if (parts.length === 0) return "";
    return `Student profile: ${parts.join(", ")}.`;
  }, [topics, sessions]);

  return {
    topics,
    sessions,
    loading,
    trackTopic,
    trackSimplification,
    trackQuiz,
    markMastered,
    trackSession,
    getProfileSummary,
    fetchProfile,
  };
}
