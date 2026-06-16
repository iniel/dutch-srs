---
name: ship-dutch-srs
description: Build, test, and deploy the Dutch SRS app to GitHub Pages. Use when asked to deploy, ship, publish, release, or "push live" this app, or after making changes that need to go to https://iniel.github.io/dutch-srs/. Encodes the prebuilt-dist deploy model and its gotchas.
---

# Ship Dutch SRS

Deploy model: **CI does not build.** `.github/workflows/deploy.yml` uploads the committed `dist/`.
So you build + commit `dist/` locally; pushing to `main` deploys it. Full context: `docs/DEPLOY.md`.

## Steps (do in order, stop on any failure)

1. **Verify green:**
   ```bash
   npm run build && npm test && npm run test:e2e
   ```
   `build` runs `tsc -b` + vite. E2E serves the freshly built `dist/`. All must pass.

2. **Commit (must include `dist/`):**
   ```bash
   git add -A
   git commit -m "<what changed>"
   ```
   `dist/` is intentionally tracked. If `public/cards.json` changed, it's included too.
   End commit messages with the Co-Authored-By trailer.

3. **Push + watch:**
   ```bash
   git push origin main
   gh run watch "$(gh run list --limit 1 --json databaseId -q '.[0].databaseId')" --exit-status
   ```

4. **Verify live (cache-bust):**
   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' "https://iniel.github.io/dutch-srs/cards.json?b=$RANDOM"
   curl -s "https://iniel.github.io/dutch-srs/?b=$RANDOM" | grep -o 'src="[^"]*\.js"'
   ```
   Expect `200` and `src="./assets/index-*.js"`. If index shows `/src/main.tsx`, raw source is being
   served (Jekyll/branch-source regression) — see `docs/DEPLOY.md` pitfalls.

## Do NOT
- Add `npm ci` / `npm run build` steps to the workflow (the runner hung on `npm ci`).
- Add a Jekyll workflow or set a Pages branch source; keep `public/.nojekyll` and `build_type=workflow`.
- Forget to commit `dist/` — without it the deploy ships stale assets.
