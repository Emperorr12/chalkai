import { useState, useRef, useCallback } from "react";

const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;

export function useTextToSpeech() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
  }, []);

  const speakFallback = useCallback((text: string, onStart: () => void, onEnd: () => void) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.88;
    utterance.pitch = 1.05;
    utterance.onstart = () => { onStart(); setIsPlaying(true); };
    utterance.onend = () => { setIsPlaying(false); onEnd(); };
    utterance.onerror = () => { setIsPlaying(false); onEnd(); };
    window.speechSynthesis.speak(utterance);
  }, []);

  const speak = useCallback(async (
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
  ) => {
    if (!voiceEnabled) return;

    stop();

    // Strip markdown/emoji for cleaner TTS
    const clean = text.replace(/[#*_~`>]/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

    try {
      const resp = await fetch(TTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text: clean }),
      });

      if (!resp.ok) throw new Error("TTS failed");

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onplay = () => { setIsPlaying(true); onStart?.(); };
      audio.onended = () => { setIsPlaying(false); onEnd?.(); URL.revokeObjectURL(url); };
      audio.onerror = () => { setIsPlaying(false); onEnd?.(); URL.revokeObjectURL(url); };

      await audio.play();
    } catch {
      // Fallback to browser speechSynthesis
      console.warn("ElevenLabs TTS unavailable, using browser fallback");
      speakFallback(clean, onStart ?? (() => {}), onEnd ?? (() => {}));
    }
  }, [voiceEnabled, stop, speakFallback]);

  return { speak, stop, isPlaying, voiceEnabled, setVoiceEnabled };
}
