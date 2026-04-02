import { useState, useCallback, useEffect } from "react";
import { type WhiteboardData } from "@/components/Whiteboard";

export interface Lesson {
  id: number;
  question: string;
  message: string;
  whiteboard: WhiteboardData | null;
  audio_text: string;
  subject: string;
  timestamp: number;
}

const STORAGE_KEY = "chalk_lesson_history";

function loadLessons(): Lesson[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useLessons() {
  const [lessons, setLessons] = useState<Lesson[]>(loadLessons);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lessons));
  }, [lessons]);

  const saveLesson = useCallback(
    (data: Omit<Lesson, "id" | "timestamp">) => {
      const lesson: Lesson = {
        ...data,
        id: Date.now(),
        timestamp: Date.now(),
      };
      setLessons((prev) => [...prev, lesson]);
      return lesson;
    },
    [],
  );

  const deleteLesson = useCallback((id: number) => {
    setLessons((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const clearLessons = useCallback(() => setLessons([]), []);

  return { lessons, saveLesson, deleteLesson, clearLessons };
}
