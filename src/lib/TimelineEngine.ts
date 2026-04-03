import type { WhiteboardElement } from "@/components/Whiteboard";

/**
 * Starts a requestAnimationFrame loop that watches audio.currentTime and
 * fires onTrigger(index) the first time currentTime passes each element's
 * delay_seconds timestamp. Returns a cancel function.
 */
export function startTimeline(
  audioElement: HTMLAudioElement,
  elements: WhiteboardElement[],
  onTrigger: (index: number) => void,
): () => void {
  const triggered = new Set<number>();
  let rafId: number;

  function tick() {
    const currentTime = audioElement.currentTime;
    elements.forEach((el, index) => {
      if (!triggered.has(index) && currentTime >= el.delay_seconds) {
        triggered.add(index);
        onTrigger(index);
      }
    });
    if (triggered.size < elements.length) {
      rafId = requestAnimationFrame(tick);
    }
  }

  rafId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(rafId);
}
