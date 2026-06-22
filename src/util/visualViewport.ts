import { useEffect } from "react";

/**
 * iOS Safari ignores `interactive-widget` and never shrinks the layout viewport
 * (or `dvh`) for the on-screen keyboard — only the visual viewport changes. Mirror
 * its height/offset onto CSS vars so a fixed pane can hug the visible region and
 * keep its bottom-pinned input above the keyboard with nothing left to scroll.
 */
export function useVisualViewportVars(active: boolean) {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!active || !vv) return;
    const root = document.documentElement;
    const apply = () => {
      root.style.setProperty("--vvh", `${vv.height}px`);
      root.style.setProperty("--vvt", `${vv.offsetTop}px`);
    };
    apply();
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    document.body.classList.add("scroll-locked");
    return () => {
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
      document.body.classList.remove("scroll-locked");
      root.style.removeProperty("--vvh");
      root.style.removeProperty("--vvt");
    };
  }, [active]);
}
