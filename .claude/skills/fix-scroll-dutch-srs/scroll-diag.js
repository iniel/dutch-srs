// Paste into: playwright-cli eval "$(cat .claude/skills/fix-scroll-dutch-srs/scroll-diag.js)"
// Reports the scroll health of the CURRENT screen at the CURRENT viewport.
// Read the JSON: a "clipped" entry = content taller than its box with no scroll = BUG.
() => {
  const vh = window.innerHeight;
  const b = document.body, de = document.documentElement;
  const all = [...document.querySelectorAll("*")];
  const scrollers = all.filter(e => {
    const s = getComputedStyle(e);
    return /(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 1;
  }).map(e => ({ cls: e.className?.toString().slice(0, 40), sh: e.scrollHeight, ch: e.clientHeight }));
  // Content overflowing a box whose overflow is clipped/hidden = unreachable content.
  const clipped = all.filter(e => {
    const s = getComputedStyle(e);
    return e.scrollHeight > e.clientHeight + 4 && /(hidden|clip)/.test(s.overflowY) && e.clientHeight > 150;
  }).map(e => ({ cls: e.className?.toString().slice(0, 40), sh: e.scrollHeight, ch: e.clientHeight, ofY: getComputedStyle(e).overflowY }));
  return JSON.stringify({
    vh,
    bodyLocked: getComputedStyle(b).position === "fixed",
    docCanScroll: de.scrollHeight > de.clientHeight + 1,
    bodyOverflows: b.scrollHeight > b.clientHeight + 1,
    scrollers,
    clipped,
  }, null, 1);
}
