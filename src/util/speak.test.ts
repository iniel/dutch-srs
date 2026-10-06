import { vi } from "vitest";
import { pronounce } from "./speak";

const speakSpy = vi.fn();

beforeEach(() => {
  speakSpy.mockReset();
  vi.stubGlobal("speechSynthesis", { speak: speakSpy, cancel: vi.fn(), getVoices: () => [] });
  vi.stubGlobal("SpeechSynthesisUtterance", class { lang = ""; voice = null; constructor(public text: string) {} });
});
afterEach(() => vi.unstubAllGlobals());

it("plays the recording when there is one and falls back to speech when it cannot play", async () => {
  const play = vi.fn().mockResolvedValue(undefined);
  const audio = vi.fn(function (this: { play: typeof play }) { this.play = play; });
  vi.stubGlobal("Audio", audio);
  pronounce("dagen", "audio/nederlands-in-gang/x.mp3");
  expect(audio).toHaveBeenCalledWith("audio/nederlands-in-gang/x.mp3");
  await Promise.resolve();
  expect(speakSpy).not.toHaveBeenCalled();

  play.mockRejectedValueOnce(new Error("NotSupportedError"));
  pronounce("dagen", "missing.mp3");
  await new Promise((r) => setTimeout(r));
  expect(speakSpy).toHaveBeenCalledTimes(1);

  pronounce("dagen");
  expect(speakSpy).toHaveBeenCalledTimes(2);
});
