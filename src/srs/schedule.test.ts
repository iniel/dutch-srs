import {
  newLessonState,
  startLesson,
  answerCorrect,
  answerIncorrect,
} from "./schedule";
import { STAGE_INTERVALS_MS } from "./stages";

const NOW = 1_000_000;

describe("newLessonState", () => {
  it("starts at stage 0, not burned, not yet due", () => {
    const s = newLessonState();
    expect(s.stage).toBe(0);
    expect(s.burned).toBe(false);
    expect(s.incorrectCount).toBe(0);
    expect(s.availableAt).toBe(Infinity);
  });
});

describe("startLesson", () => {
  it("moves stage 0 -> 1 and schedules by stage-1 interval", () => {
    const s = startLesson(newLessonState(), NOW);
    expect(s.stage).toBe(1);
    expect(s.availableAt).toBe(NOW + STAGE_INTERVALS_MS[1]);
    expect(s.lastReviewedAt).toBe(NOW);
  });
});

describe("answerCorrect", () => {
  it("advances 1 -> 9 (burned) across successive correct answers", () => {
    let s = startLesson(newLessonState(), NOW);
    const expected = [2, 3, 4, 5, 6, 7, 8];
    for (const stage of expected) {
      s = answerCorrect(s, NOW);
      expect(s.stage).toBe(stage);
      expect(s.availableAt).toBe(NOW + STAGE_INTERVALS_MS[stage]);
      expect(s.burned).toBe(false);
    }
    s = answerCorrect(s, NOW);
    expect(s.stage).toBe(9);
    expect(s.burned).toBe(true);
    expect(s.availableAt).toBe(Infinity);
  });

  it("treats stage 0 as baseline stage 1 (guard)", () => {
    const s = answerCorrect(newLessonState(), NOW);
    expect(s.stage).toBe(2);
    expect(s.availableAt).toBe(NOW + STAGE_INTERVALS_MS[2]);
  });

  it("sets lastReviewedAt", () => {
    const s = answerCorrect(startLesson(newLessonState(), 0), NOW);
    expect(s.lastReviewedAt).toBe(NOW);
  });
});

describe("answerIncorrect", () => {
  it("demotes apprentice by 1 stage", () => {
    let s = startLesson(newLessonState(), NOW);
    s = answerCorrect(s, NOW); // stage 2
    s = answerCorrect(s, NOW); // stage 3
    const before = s.incorrectCount;
    s = answerIncorrect(s, NOW);
    expect(s.stage).toBe(2);
    expect(s.incorrectCount).toBe(before + 1);
    expect(s.availableAt).toBe(NOW + STAGE_INTERVALS_MS[2]);
    expect(s.burned).toBe(false);
  });

  it("demotes guru+ by 2 stages", () => {
    let s = startLesson(newLessonState(), NOW);
    for (let i = 0; i < 4; i++) s = answerCorrect(s, NOW); // stage 5 (guru)
    expect(s.stage).toBe(5);
    s = answerIncorrect(s, NOW);
    expect(s.stage).toBe(3);
    expect(s.availableAt).toBe(NOW + STAGE_INTERVALS_MS[3]);
  });

  it("clamps demotion at stage 1", () => {
    const s = answerIncorrect(startLesson(newLessonState(), NOW), NOW);
    expect(s.stage).toBe(1);
    expect(s.availableAt).toBe(NOW + STAGE_INTERVALS_MS[1]);
  });

  it("never burns and increments incorrectCount", () => {
    const s = answerIncorrect(newLessonState(), NOW);
    expect(s.burned).toBe(false);
    expect(s.incorrectCount).toBe(1);
    expect(s.stage).toBe(1);
  });
});
