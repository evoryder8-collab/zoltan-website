# Zoltan website

Bilingual (Hungarian / English) one-page site for Zoltan, massage therapist and AusMC 2026 Overall Winner. Crimson silk background, liquid-glass panels, a 3D laurel and medal (three.js), a championship globe and studio map (MapLibre + OpenFreeMap) and Zoltan's soundtrack under synthesised UI sounds.

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

## Link in bio

`/linkinbio/` (`linkinbio/index.html`, `src/bio.js`, `src/styles/bio.css`) is the page for the social profiles: who Zoltan is, a booking sheet (studio, then WhatsApp or a call), every contact and social in tinted glass, the film, links into the site and the studio map. It isn't linked from the site. Live: https://evoryder8-collab.github.io/zoltan-website/linkinbio/ (at launch: `zoltankodor.com/linkinbio`). "Save my contact" downloads `public/zoltan-kodor.vcf`, written by `python3 scripts/build-vcard.py`.

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
- `src/lib/space.js`: the universe around the globe (nebula, stars, shooting stars)
- `src/components/orbs.js`: the floating contact jewels, each asking before it leaves the site
- `src/lib/audio.js`: the soundtrack (`src/media/soundtrack.m4a`, looped, stepped back under the films) and the UI sounds synthesised with Web Audio; off until the visitor turns it on
- Language: `?lang=hu|en`, then the saved choice, then the browser language
- `prefers-reduced-motion` turns off the intro animation, ripples, orbit and marquee

## Before going live

- Fill in `docs/CONTENT-TODO.md`
- Remove `<meta name="robots" content="noindex">` from `index.html` and `linkinbio/index.html`
- If the site moves to its own domain, update `og:url` and `og:image` in both pages (share previews need absolute URLs), and `SITE` in `scripts/build-vcard.py` (then run it again)
