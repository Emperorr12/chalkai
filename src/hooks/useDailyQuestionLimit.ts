const STORAGE_KEY = "chalk_daily_questions";
const FREE_LIMIT = 5;

interface DailyData {
  count: number;
  date: string;
}

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function getData(): DailyData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, date: getTodayString() };
    const parsed: DailyData = JSON.parse(raw);
    // Reset if it's a new day
    if (parsed.date !== getTodayString()) {
      return { count: 0, date: getTodayString() };
    }
    return parsed;
  } catch {
    return { count: 0, date: getTodayString() };
  }
}

function setData(data: DailyData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getDailyCount(): number {
  return getData().count;
}

export function incrementDailyCount(): number {
  const data = getData();
  data.count += 1;
  setData(data);
  return data.count;
}

export function hasReachedLimit(): boolean {
  return getData().count >= FREE_LIMIT;
}

export const DAILY_LIMIT = FREE_LIMIT;
