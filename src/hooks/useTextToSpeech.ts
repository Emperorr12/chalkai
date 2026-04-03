import { useState, useRef, useCallback, useEffect } from "react";

const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;

/**
 * Mobile browsers require audio playback to be initiated from a user gesture.
 * We "unlock" the Audio context by playing a silent buffer on the first user
 * interaction, then reuse that same Audio element for all subsequent TTS.
 */
export function useTextToSpeech() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [volume, setVolumeState] = useState(0.8);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);
  const pendingRef = useRef<{ url: string; onStart?: () => void; onEnd?: () => void } | null>(null);

  // Create a persistent audio element that gets unlocked on first user tap
  useEffect(() => {
    const audio = new Audio();
    // Prevents mobile browsers from pausing when app goes to background briefly
    audio.setAttribute("playsinline", "true");
    audioRef.current = audio;

    const unlock = () => {
      if (unlockedRef.current) return;
      // Play a tiny silent data-uri to unlock the audio context
      audio.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
      audio.volume = 0;
      const p = audio.play();
      if (p) {
        p.then(() => {
          unlockedRef.current = true;
          audio.pause();
          audio.volume = 1;
          audio.src = "";
        }).catch(() => {});
      }
    };

    document.addEventListener("touchstart", unlock, { once: false, passive: true });
    document.addEventListener("click", unlock, { once: false, passive: true });

    return () => {
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("click", unlock);
      audio.pause();
      audio.src = "";
    };
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      if (audio.src && audio.src.startsWith("blob:")) {
        URL.revokeObjectURL(audio.src);
      }
      audio.src = "";
    }
    pendingRef.current = null;
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
  }, []);

  const speakFallback = useCallback((text: string, onStart: () => void, onEnd: () => void) => {
    if (!window.speechSynthesis) {
      onStart();
      onEnd();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.88;
    utterance.pitch = 1.05;
    utterance.onstart = () => { onStart(); setIsPlaying(true); };
    utterance.onend = () => { setIsPlaying(false); onEnd(); };
    utterance.onerror = () => { setIsPlaying(false); onEnd(); };
    window.speechSynthesis.speak(utterance);
  }, []);

  const playBlob = useCallback((blobUrl: string, onStart?: () => void, onEnd?: () => void) => {
    const audio = audioRef.current;
    if (!audio) return;

    const cleanup = () => {
      setIsPlaying(false);
      onEnd?.();
      URL.revokeObjectURL(blobUrl);
    };

    audio.onplay = () => { setIsPlaying(true); onStart?.(); };
    audio.onended = cleanup;
    audio.onerror = cleanup;
    audio.src = blobUrl;

    const p = audio.play();
    if (p) {
      p.catch(() => {
        // If play still fails (not unlocked), store as pending — will play on next tap
        console.warn("Audio play blocked — will retry on next user interaction");
        pendingRef.current = { url: blobUrl, onStart, onEnd };

        const retryOnGesture = () => {
          const pending = pendingRef.current;
          if (!pending) return;
          pendingRef.current = null;
          const a = audioRef.current;
          if (!a) return;
          a.src = pending.url;
          a.onplay = () => { setIsPlaying(true); pending.onStart?.(); };
          const c = () => { setIsPlaying(false); pending.onEnd?.(); URL.revokeObjectURL(pending.url); };
          a.onended = c;
          a.onerror = c;
          a.play().catch(() => { c(); });
        };
        document.addEventListener("touchstart", retryOnGesture, { once: true, passive: true });
        document.addEventListener("click", retryOnGesture, { once: true, passive: true });
      });
    }
  }, []);

  const speak = useCallback(async (
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
  ) => {
    if (!voiceEnabled) {
      // When voice is disabled, fire callbacks immediately so callers can sync
      onStart?.();
      onEnd?.();
      return;
    }

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
      playBlob(url, onStart, onEnd);
    } catch {
      console.warn("ElevenLabs TTS unavailable, using browser fallback");
      speakFallback(clean, onStart ?? (() => {}), onEnd ?? (() => {}));
    }
  }, [voiceEnabled, stop, speakFallback, playBlob]);

  return { speak, stop, isPlaying, voiceEnabled, setVoiceEnabled };
}
