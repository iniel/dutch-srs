import { useCallback, useEffect, useRef } from "react";

const DEFAULT_DELAY_MS = 500;
const MOVE_TOLERANCE_PX = 10;

interface LongPressOptions {
  onLongPress: () => void;
  onClick: () => void;
  enabled: boolean;
  delayMs?: number;
}

// Owns onClick so the click after a fired long press can be swallowed; an onClick spread alongside would clobber it.
export function useLongPress({ onLongPress, onClick, enabled, delayMs = DEFAULT_DELAY_MS }: LongPressOptions) {
  const timer = useRef<number | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
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

  return {
    onPointerDown(e: React.PointerEvent<HTMLElement>) {
      if (e.button !== 0) return;
      cancel();
      fired.current = false;
      origin.current = { x: e.clientX, y: e.clientY };
      timer.current = window.setTimeout(() => {
        timer.current = null;
        origin.current = null;
        fired.current = true;
        onLongPress();
      }, delayMs);
    },
    onPointerMove(e: React.PointerEvent<HTMLElement>) {
      const start = origin.current;
      if (!start) return;
      const moved =
        Math.abs(e.clientX - start.x) > MOVE_TOLERANCE_PX ||
        Math.abs(e.clientY - start.y) > MOVE_TOLERANCE_PX;
      if (moved) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
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
