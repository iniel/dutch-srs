declare global {
  interface Window {
    __NOW__?: number;
  }
}

/** Current time in ms. A test/E2E hook can pin it via window.__NOW__. */
export function now(): number {
  if (typeof window !== "undefined" && typeof window.__NOW__ === "number") {
    return window.__NOW__;
  }
  return Date.now();
}
