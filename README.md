# Zoltan website

Bilingual (Hungarian / English) one-page site for Zoltan, massage therapist and AusMC 2026 Overall Winner. Crimson silk background, liquid-glass panels, a 3D laurel and medal (three.js), a championship globe and studio map (MapLibre + OpenFreeMap) and synthesised sound.

Design: `docs/superpowers/specs/2026-10-27-zoltan-website-design.md`. Missing content: `docs/CONTENT-TODO.md`.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5183. `npm run build` writes the static site to `dist/`. `npm test` runs the unit tests.

## Live test page

https://evoryder8-collab.github.io/zoltan-website/

Every push to `main` runs `.github/workflows/deploy.yml` (tests, build, deploy to GitHub Pages). The page carries `noindex` so search engines skip it until launch.

## Edit content

- Words, both languages: `src/i18n/hu.js` and `src/i18n/en.js`. Text in `[brackets]` shows as a placeholder on the page.
- Phone, WhatsApp, email, socials, studio locations and prices, championship locations: `src/config.js`.
- Gallery photos: add the source to `GALLERY` in `scripts/build-images.py`, run `npm run images`, add the entry to `src/data/gallery.js` and a caption under `gallery.captions` in both language files.
- Share image and home-screen icon: `npm run social` (uses macOS fonts).

## How it is built

- Vite + vanilla JS, GSAP, Lenis smooth scroll
- `src/lib/silk.js`: WebGL crimson silk background; touching the page sends a ripple through it
- `src/lib/glass.js`: liquid glass (pointer-lit rims, edge refraction in Chromium), adapted from the AusMC landing page
- `src/components/laurel3d.js` and `medal3d.js`: procedural three.js laurel wreath and spinnable medal, loaded on demand
- `src/components/globe.js` and `studio-map.js`: MapLibre globe with arcs to each championship, and the studio map with 3D buildings
- `src/lib/audio.js`: every sound synthesised with Web Audio; off until the visitor turns it on
- Language: `?lang=hu|en`, then the saved choice, then the browser language
- `prefers-reduced-motion` turns off the intro animation, ripples, orbit and marquee

## Before going live

- Fill in `docs/CONTENT-TODO.md`
- Remove `<meta name="robots" content="noindex">` from `index.html`
- If the site moves to its own domain, update `og:url` and `og:image` in `index.html` (share previews need absolute URLs)
