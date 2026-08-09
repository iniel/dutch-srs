import { useCallback, useEffect, useRef } from "react";

const DEFAULT_DELAY_MS = 500;
const MOVE_TOLERANCE_PX = 10;
const DRIFT_TOLERANCE_PX = 2;

interface LongPressOptions {
  onLongPress: () => void;
  onClick: () => void;
  enabled: boolean;
  delayMs?: number;
}

interface PressOrigin {
  x: number;
  y: number;
  el: HTMLElement;
  top: number;
}

// Owns onClick so the click after a fired long press can be swallowed; an onClick spread alongside would clobber it.
export function useLongPress({ onLongPress, onClick, enabled, delayMs = DEFAULT_DELAY_MS }: LongPressOptions) {
  const timer = useRef<number | null>(null);
  const origin = useRef<PressOrigin | null>(null);
  const fired = useRef(false);

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    origin.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  if (!enabled) return { onClick: () => onClick() };

  function moveTo(x: number, y: number) {
    const start = origin.current;
    if (!start) return;
    const moved =
      Math.abs(x - start.x) > MOVE_TOLERANCE_PX || Math.abs(y - start.y) > MOVE_TOLERANCE_PX;
    if (moved) cancel();
  }

  return {
    onPointerDown(e: React.PointerEvent<HTMLElement>) {
      if (e.button !== 0) return;
      cancel();
      fired.current = false;
      const el = e.currentTarget;
      origin.current = { x: e.clientX, y: e.clientY, el, top: el.getBoundingClientRect().top };
      timer.current = window.setTimeout(() => {
        timer.current = null;
        const start = origin.current;
        origin.current = null;
        // The finger can sit still while the list scrolls under it, which would
        // hand us whichever row slid into place. Only fire if the row held still.
        if (!start || Math.abs(start.el.getBoundingClientRect().top - start.top) > DRIFT_TOLERANCE_PX) return;
        fired.current = true;
        onLongPress();
      }, delayMs);
    },
    onPointerMove(e: React.PointerEvent<HTMLElement>) {
      moveTo(e.clientX, e.clientY);
    },
    onPointerUp: cancel,
    // Deliberately no pointercancel/pointerleave cancel: iOS fires both while
    // the finger is still down — pointercancel once its pan recogniser claims a
    // scrolled page, pointerleave when the row slides out from under the finger.
    // A lift arrives as touchend, and a real scroll is caught by the drift check.
    onTouchMove(e: React.TouchEvent<HTMLElement>) {
      const touch = e.touches[0];
      if (touch) moveTo(touch.clientX, touch.clientY);
    },
    onTouchEnd: cancel,
    onTouchCancel: cancel,
    onClick() {
      if (fired.current) {
        fired.current = false;
        return;
      }
      onClick();
    },
    onContextMenu(e: React.MouseEvent<HTMLElement>) {
      e.preventDefault();
    },
  };
}
