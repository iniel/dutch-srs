import { useEffect, useLayoutEffect, useRef } from "react";

// Records the position with a scroll listener rather than in a layout-effect
// cleanup: that cleanup runs during React's mutation phase, by which point the
// shorter next screen has already clamped scrollY to 0.
export function useScrollMemory(key: string) {
  const positions = useRef(new Map<string, number>());
  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    const onScroll = () => positions.current.set(keyRef.current, window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useLayoutEffect(() => {
    window.scrollTo(0, positions.current.get(key) ?? 0);
  }, [key]);
}
