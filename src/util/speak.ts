export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Speak text aloud, preferring a Dutch voice. No-op if unsupported. */
export function speak(text: string, lang = "nl-NL"): void {
  if (!speechSupported()) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("nl"));
  if (voice) u.voice = voice;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

/** Play a recorded pronunciation when there is one; fall back to speech synthesis. */
export function pronounce(text: string, audioUrl?: string): void {
  if (!audioUrl) return speak(text);
  new Audio(audioUrl).play().catch(() => speak(text));
}

export function canPronounce(audioUrl?: string): boolean {
  return Boolean(audioUrl) || speechSupported();
}
