// Full-flow E2E: lessons -> reviews -> SRS scheduling -> persistence -> reset.
// Uses the playwright bundled with the globally-installed @playwright/cli (browsers
// already present), so it needs no project dependency. Serves the built dist via
// `vite preview` and drives a deterministic injected clock (window.__NOW__).
import { execSync, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { setTimeout as sleep } from "node:timers/promises";

const require = createRequire(import.meta.url);
const gRoot = execSync("npm root -g").toString().trim();
const { chromium } = require(`${gRoot}/@playwright/cli/node_modules/playwright`);

const PORT = 5199;
const BASE_URL = `http://localhost:${PORT}/`;
const HOUR = 3600_000;
const CLOCK_BASE = 1_700_000_000_000;

let failures = 0;
function check(cond, label) {
  if (cond) console.log(`  ✓ ${label}`);
  else {
    console.error(`  ✗ ${label}`);
    failures++;
  }
}

const initScript = `window.__NOW__ = ${CLOCK_BASE} + Number(localStorage.getItem("__now_offset__") || 0);`;

async function readState(page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem("dutch-srs-progress-v1");
    const states = raw ? JSON.parse(raw).states : {};
    const hist = {};
    for (const v of Object.values(states)) hist[v.stage] = (hist[v.stage] || 0) + 1;
    return { count: Object.keys(states).length, hist, states };
  });
}

async function answerAll(page, cards) {
  let guard = 0;
  while (guard++ < 400) {
    if (await page.$(".summary-pct")) return;
    if (!(await page.$(".answer-input"))) return;
    const info = await page.evaluate(() => ({
      label: document.querySelector(".prompt-label")?.textContent || "",
      prompt: document.querySelector(".prompt-text")?.textContent || "",
      wrong: !!document.querySelector(".feedback-answer"),
    }));
    if (info.wrong) {
      await page.keyboard.press("Enter");
      await page.waitForTimeout(20);
      continue;
    }
    const nlen = info.label.includes("Dutch →");
    let ans = "?";
    if (nlen) {
      const c = cards.find((c) => c.dutch === info.prompt);
      if (c) ans = c.english[0];
    } else {
      const c = cards.find((c) => c.english.join(" / ") === info.prompt);
      if (c) ans = c.dutch;
    }
    if (ans === "?") {
      console.error(`    ! no match: ${JSON.stringify(info)} len=${info.prompt.length} cards=${cards.length}`);
      console.error(`      byDutch? ${!!cards.find((c) => c.dutch === info.prompt)} byEngJoin? ${!!cards.find((c) => c.english.join(" / ") === info.prompt)}`);
      throw new Error(`unmatched prompt: ${info.prompt}`);
    }
    await page.fill(".answer-input", ans);
    await page.waitForTimeout(15);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(20);
  }
}

async function setClockOffset(page, ms) {
  await page.evaluate((v) => localStorage.setItem("__now_offset__", String(v)), ms);
}

const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
  stdio: "ignore",
});
await sleep(2500);

const browser = await chromium.launch({ channel: "chrome" });
let exitCode = 0;
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(initScript);
  const page = await context.newPage();
  await page.goto(BASE_URL);
  await page.waitForSelector(".action-card");

  const cards = await page.evaluate(async () => await (await fetch("cards.json")).json());

  console.log("Dashboard (fresh):");
  const lessons0 = Number(await page.textContent(".action-card.lessons .action-count"));
  const reviews0 = Number(await page.textContent(".action-card.reviews .action-count"));
  check(lessons0 > 100, `lessons available (${lessons0})`);
  check(reviews0 === 0, `no reviews due (${reviews0})`);

  console.log("Lesson flow:");
  await page.click(".action-card.lessons");
  for (let i = 0; i < 8; i++) {
    if (await page.$(".answer-input")) break;
    const btns = await page.$$(".btn.primary");
    await btns[btns.length - 1].click();
    await page.waitForTimeout(60);
  }
  await answerAll(page, cards);
  await page.waitForSelector(".summary-pct");
  const lessonPct = await page.textContent(".summary-pct");
  check(lessonPct === "100%", `lesson quiz 100% (${lessonPct})`);
  await page.click(".summary .btn.primary");
  await page.waitForSelector(".action-card");

  const afterLesson = await readState(page);
  check(afterLesson.count === 10, `10 items learned (${afterLesson.count})`);
  check(afterLesson.hist["1"] === 10, `all at stage 1 (${JSON.stringify(afterLesson.hist)})`);
  const lessons1 = Number(await page.textContent(".action-card.lessons .action-count"));
  check(lessons1 === lessons0 - 5, `lessons decreased by batch (${lessons0}->${lessons1})`);

  console.log("Clock +5h -> reviews due:");
  await setClockOffset(page, 5 * HOUR);
  await page.reload();
  await page.waitForSelector(".action-card");
  const reviewsDue = Number(await page.textContent(".action-card.reviews .action-count"));
  check(reviewsDue === 10, `10 reviews due after 5h (${reviewsDue})`);

  console.log("Review flow + SRS advance:");
  await page.click(".action-card.reviews");
  await page.waitForSelector(".answer-input");
  await answerAll(page, cards);
  await page.waitForSelector(".summary-pct");
  const reviewPct = await page.textContent(".summary-pct");
  check(reviewPct === "100%", `review session 100% (${reviewPct})`);
  await page.click(".summary .btn.primary");
  await page.waitForSelector(".action-card");

  const afterReview = await readState(page);
  check(afterReview.hist["2"] === 10, `all advanced to stage 2 (${JSON.stringify(afterReview.hist)})`);
  const sample = Object.values(afterReview.states)[0];
  check(
    sample.availableAt - sample.lastReviewedAt === 8 * HOUR,
    `stage 2 scheduled +8h (${(sample.availableAt - sample.lastReviewedAt) / HOUR}h)`,
  );
  const reviewsNow = Number(await page.textContent(".action-card.reviews .action-count"));
  check(reviewsNow === 0, `no reviews due right after (${reviewsNow})`);

  console.log("Persistence across reload:");
  await page.reload();
  await page.waitForSelector(".action-card");
  const persisted = await readState(page);
  check(persisted.count === 10, `progress persisted (${persisted.count})`);

  console.log("Settings reset:");
  await page.click(".icon-btn");
  await page.waitForSelector(".settings");
  page.once("dialog", (d) => d.accept());
  await page.click(".btn.danger");
  await page.click(".settings .icon-btn");
  await page.waitForSelector(".action-card");
  const afterReset = await readState(page);
  check(afterReset.count === 0, `reset cleared states (${afterReset.count})`);
} catch (e) {
  console.error("E2E threw:", e);
  exitCode = 1;
} finally {
  await browser.close();
  server.kill();
}

if (failures > 0) {
  console.error(`\nE2E FAILED: ${failures} check(s) failed.`);
  process.exit(1);
}
console.log(`\nE2E PASSED${exitCode ? " (with errors)" : ""}.`);
process.exit(exitCode);
