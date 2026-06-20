import {
  STAGE_INTERVALS_MS,
  STAGE_COLORS,
  stageName,
  stageLabel,
  stageCategory,
  MIN_REVIEW_STAGE,
  BURNED_STAGE,
} from "./stages";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe("STAGE_INTERVALS_MS", () => {
  it("maps each review stage to its interval", () => {
    expect(STAGE_INTERVALS_MS[1]).toBe(4 * HOUR);
    expect(STAGE_INTERVALS_MS[2]).toBe(8 * HOUR);
    expect(STAGE_INTERVALS_MS[3]).toBe(1 * DAY);
    expect(STAGE_INTERVALS_MS[4]).toBe(2 * DAY);
    expect(STAGE_INTERVALS_MS[5]).toBe(7 * DAY);
    expect(STAGE_INTERVALS_MS[6]).toBe(14 * DAY);
    expect(STAGE_INTERVALS_MS[7]).toBe(30 * DAY);
    expect(STAGE_INTERVALS_MS[8]).toBe(120 * DAY);
  });

  it("has no interval for burned stage 9", () => {
    expect(STAGE_INTERVALS_MS[9]).toBeUndefined();
  });
});

describe("stageCategory", () => {
  it.each([
    [0, "lesson"],
    [1, "apprentice"],
    [4, "apprentice"],
    [5, "guru"],
    [6, "guru"],
    [7, "master"],
    [8, "enlightened"],
    [9, "burned"],
  ])("stage %i -> %s", (stage, category) => {
    expect(stageCategory(stage)).toBe(category);
  });
});

describe("stageName", () => {
  it.each([
    [0, "Lesson"],
    [1, "Apprentice"],
    [5, "Guru"],
    [7, "Master"],
    [8, "Enlightened"],
    [9, "Burned"],
  ])("stage %i -> %s", (stage, name) => {
    expect(stageName(stage)).toBe(name);
  });
});

describe("stageLabel", () => {
  it.each([
    [0, "Lesson"],
    [1, "Apprentice I"],
    [2, "Apprentice II"],
    [3, "Apprentice III"],
    [4, "Apprentice IV"],
    [5, "Guru I"],
    [6, "Guru II"],
    [7, "Master"],
    [8, "Enlightened"],
    [9, "Burned"],
  ])("stage %i -> %s", (stage, label) => {
    expect(stageLabel(stage)).toBe(label);
  });
});

describe("STAGE_COLORS", () => {
  it("maps categories to hex colors", () => {
    expect(STAGE_COLORS.apprentice).toBe("#de0094");
    expect(STAGE_COLORS.guru).toBe("#872b9e");
    expect(STAGE_COLORS.master).toBe("#294ddb");
    expect(STAGE_COLORS.enlightened).toBe("#0094de");
    expect(STAGE_COLORS.burned).toBe("#424242");
    expect(STAGE_COLORS.lesson).toBe("#888");
  });
});

describe("constants", () => {
  it("exposes min review and burned stages", () => {
    expect(MIN_REVIEW_STAGE).toBe(1);
    expect(BURNED_STAGE).toBe(9);
  });
});
