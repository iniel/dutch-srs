import { registerSW } from "virtual:pwa-register";

const FOREGROUND_UPDATE_INTERVAL = 60 * 60 * 1000;

let updateSW: ((reload?: boolean) => Promise<void>) | null = null;

export function registerPwa(onNeedRefresh: () => void): (reload?: boolean) => Promise<void> {
  if (updateSW) return updateSW;

  updateSW = registerSW({
    immediate: true,
    onNeedRefresh,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") registration.update();
      });
      setInterval(() => registration.update(), FOREGROUND_UPDATE_INTERVAL);
    },
  });

  return updateSW;
}
