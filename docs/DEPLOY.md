# Deploy

Host: **GitHub Pages**, repo `iniel/dutch-srs`, public. Live: https://iniel.github.io/dutch-srs/

## Model: deploy the prebuilt `dist/`
CI does **not** build. `.github/workflows/deploy.yml` just uploads the committed `dist/` and deploys it
to Pages. So **you build locally and commit `dist/`**.

Why: `npm ci` hung on the GitHub runner (multi-minute, flaky). Local build is fast and already verified,
so we ship it directly. `dist/` is intentionally **not** gitignored.

## Ship a change
```bash
npm run build                 # tsc -b + vite build -> dist/
npm test && npm run test:e2e  # must be green
git add -A                    # includes dist/ and (if changed) public/cards.json
git commit -m "..."
git push                      # push to main auto-triggers the deploy workflow
```
Then watch it:
```bash
gh run watch "$(gh run list --limit 1 --json databaseId -q '.[0].databaseId')" --exit-status
```
Verify live (cache-bust):
```bash
curl -s -o /dev/null -w '%{http_code}\n' "https://iniel.github.io/dutch-srs/cards.json?b=$RANDOM"  # 200
curl -s "https://iniel.github.io/dutch-srs/?b=$RANDOM" | grep -o 'src="[^"]*\.js"'                  # ./assets/index-*.js
```
The live `index.html` must reference `./assets/index-*.js` (built). If it references `/src/main.tsx`,
raw source is being served — see pitfalls.

## Pitfalls (these actually happened — don't repeat)
- **Jekyll fight.** Enabling Pages auto-added a `jekyll-gh-pages.yml` workflow + a branch source; it
  served raw repo source and cancelled our deploy via the shared `pages` concurrency group. Fixed by:
  deleting that workflow, `public/.nojekyll`, and `gh api -X POST repos/iniel/dutch-srs/pages -f build_type=workflow`.
  Don't re-add a Jekyll workflow or set a branch source.
- **CI build hang.** Don't reintroduce `npm ci`/`npm run build` steps in the workflow unless you've
  fixed the runner hang. Keep upload-only.
- **Absolute asset paths.** `vite.config.ts` uses `base: "./"` for the `/dutch-srs/` subpath. Keep it.

## First-time setup (already done, for reference)
```bash
gh repo create dutch-srs --public --source=. --remote=origin --push
gh api -X POST repos/iniel/dutch-srs/pages -f build_type=workflow
```

## Updating the live PWA on iPhone
Service worker is `autoUpdate` (vite-plugin-pwa). After a deploy, the installed app updates on next
launch (may take one reload). Hard refresh in Safari if needed.

## Alternative hosts
For a private repo + non-public URL, Cloudflare Pages / Netlify deploy private repos free — but they
*do* build on their runners, so you'd need the `npm ci` hang resolved or set the build command to
`echo skip` and publish the committed `dist/`.
