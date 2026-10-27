# Zoltan Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Zoltan's bilingual (HU/EN) one-page site from the approved spec `docs/superpowers/specs/2026-10-27-zoltan-website-design.md`.

**Architecture:** Vite multi-module vanilla JS app. `index.html` holds the semantic skeleton with `data-i18n` keys; `src/main.js` boots shared systems (i18n, glass, silk, audio, Lenis) and initialises each section module. Heavy pieces (three.js laurel and medal, MapLibre globe and studio map) are dynamic imports triggered by an IntersectionObserver.

**Tech Stack:** Vite 8, GSAP 3, Lenis 1, three 0.18x, maplibre-gl 5+, @fontsource Bodoni Moda + Manrope, Vitest, Python 3 + Pillow (asset script only).

## Global Constraints

- Work only in `~/Downloads/Zoltan Website`. Copy approved assets in; never link outside the repo.
- Do not commit, push or deploy unless the user asks.
- Palette: `--ink #0b0607`, `--crimson #c3122f`, `--ember #ff3b4e`, `--pearl #f6f1ec`, `--pearl-dim #bdb3ab`. No gold in UI chrome.
- Fonts: Bodoni Moda (display), Manrope (text), via `@fontsource`, latin-ext included.
- Every visible string lives in `src/i18n/hu.js` and `src/i18n/en.js`. Placeholders are written `[like this]` and listed in `docs/CONTENT-TODO.md`.
- Confirmed facts: AusMC 2026 (Cockatoo Island, Sydney, 9–11 Oct 2026) Overall Winner and Freestyle Massage Award. EMC 2026 in Paris. No prize amounts.
- Sound is off until the visitor opts in. `prefers-reduced-motion` disables intro animation, ripples, orbit and marquee.
- No forms, no backend. Booking = `tel:` and `https://wa.me/<digits>?text=`.

## File structure

```
index.html                      skeleton, meta, data-i18n keys
package.json / vite.config.js   scripts: dev, build, preview, test, images
scripts/build-images.py         copies + resizes approved photos into public/img
public/img/                     generated WebP (gallery 800/1600, cut-outs, portraits)
public/favicon.svg, og.jpg      Z monogram icon, 1200x630 share image
src/main.js                     boot order, lazy loaders, Lenis + ScrollTrigger glue
src/config.js                   contact data, studio, prices, events (coords)
src/i18n/{index,hu,en}.js       t(), setLang(), applyI18n(); dictionaries
src/lib/lang.js                 detectLang({search, stored, navigatorLangs})
src/lib/links.js                waLink(), telLink(), mailLink()
src/lib/geo.js                  greatCircle(a, b, steps)
src/lib/glass.js                adapted from AusMC (pointer specular + lens)
src/lib/silk.js                 WebGL silk background with touch ripples
src/lib/audio.js                synth SFX engine: sound.tap() etc.
src/lib/lazy.js                 whenNear(el, loader, margin)
src/components/intro.js         language + sound overlay
src/components/nav.js           nav pill, lang switch, sound toggle, dock
src/components/hero.js          hero reveal + ticker
src/components/laurel3d.js      three.js laurel wreath
src/components/sections.js      about, treatments, training, contact render
src/components/championships.js event cards + medal mount + globe link
src/components/medal3d.js       three.js medal toy
src/components/globe.js         MapLibre globe with arcs
src/components/gallery.js       filters, drag track, viewer
src/components/studio-map.js    MapLibre 3D studio map + directions chooser
src/data/gallery.js             gallery manifest (file, category, caption keys)
src/styles/*.css                tokens/base, glass, intro, nav, hero, sections, gallery, maps
tests/*.test.js                 vitest for lang, i18n, links, geo
docs/CONTENT-TODO.md            every placeholder to fill
README.md                       how to run, edit content, add photos, deploy
```

## Interfaces shared across tasks

- `detectLang({ search, stored, languages }) → 'hu' | 'en'`
- `t(key, vars?) → string` (dot path; `{name}` interpolation; falls back en → key)
- `setLang(lang) → void` (updates `<html lang>`, title, meta description, saves choice, re-applies, dispatches `window` event `langchange` with `detail.lang`)
- `getLang() → 'hu' | 'en'`
- `applyI18n(root = document)` (fills `[data-i18n]` text, `[data-i18n-attr="attr:key;attr2:key2"]` attributes)
- `waLink(number, text) → string`, `telLink(number) → string`, `mailLink(email, subject, body?) → string`
- `greatCircle([lng, lat], [lng, lat], steps = 64) → [lng, lat][]` (handles antimeridian by unwrapping longitudes)
- `sound.enable(bool)`, `sound.enabled`, `sound.tap()`, `sound.hover()`, `sound.chime()`, `sound.clink(strength)`, `sound.whoosh()`, `sound.ripple()`, `sound.ambient(on)`
- `initSilk(canvas, { reduced }) → { ripple(x, y), setIntensity(v) }`
- `whenNear(el, loader, margin = '600px') → void` (calls loader once)
- `mountLaurel(container, { reduced, onComplete }) → { destroy() }`
- `mountMedal(container, { reduced }) → { destroy() }`
- `mountGlobe(container, { events, home, reduced }) → { flyTo(id) }`
- `mountStudioMap(container, { studio, reduced }) → { destroy() }`

## Tasks

### Task 1: Scaffold
- [ ] `package.json` (type module; scripts `dev`, `build`, `preview`, `test: vitest run`, `images: python3 scripts/build-images.py`), `vite.config.js` (`base: './'`), `.gitignore` (`node_modules`, `dist`, `.DS_Store`).
- [ ] `npm install gsap lenis three maplibre-gl @fontsource-variable/bodoni-moda @fontsource-variable/manrope` and `npm install -D vite vitest`.
- [ ] Minimal `index.html` + `src/main.js`; `npx vite build` succeeds.

### Task 2: Pure logic (TDD)
- [ ] Write `tests/lang.test.js`, `tests/i18n.test.js`, `tests/links.test.js`, `tests/geo.test.js` first (cases below), run → fail.
  - lang: `?lang=en` beats stored `hu`; stored beats browser; `['hu-HU']` → `hu`; `['de-DE','hu']` → `hu`; `['fr']` → `en`; invalid `?lang=xx` ignored.
  - i18n: `t('a.b')` reads current dict; missing in hu falls back to en; missing everywhere returns key; `{name}` interpolation.
  - links: `waLink('+36 30 123 4567','Szia!')` → `https://wa.me/36301234567?text=Szia!` (encoded); `telLink('+36 30 123 4567')` → `tel:+36301234567`; `mailLink('a@b.hu','Hi there')` → `mailto:a@b.hu?subject=Hi%20there`.
  - geo: endpoints equal inputs; 65 points for steps 64; Budapest→Sydney longitudes are continuous (no jump > 180 between neighbours).
- [ ] Implement `src/lib/lang.js`, `src/i18n/index.js` (dictionaries injectable for tests via `registerDictionaries`), `src/lib/links.js`, `src/lib/geo.js`; run → pass.

### Task 3: Assets
- [ ] `scripts/build-images.py`: source list (spec Assets section + the 20 proofs below), outputs WebP to `public/img/` (`g-<slug>-800.webp`, `g-<slug>-1600.webp`; cut-outs `cutout-kneel-1600.webp`, `cutout-stand-1600.webp` + `-900`), prints a JSON manifest.
- [ ] Proofs (from `z-final-proof/`): 20792, 20803, 20822, 20922, 20962, 21006, 21016, 21052, 21063, 21106, 90361, 90400, 90424, 90439, 90715, 91449, 91467, 91517, 91612, 91691 (`<id>-<hash>.jpg`).
- [ ] `src/data/gallery.js` with `{ id, src800, src1600, w, h, cat: 'treatment'|'stretch'|'awards'|'portrait', caption: 'gallery.captions.<id>' }`.

### Task 4: Foundations
- [ ] Styles: tokens, typography, layout, glass recipe (AusMC), focus states, reduced motion.
- [ ] `src/lib/glass.js` (adapted from AusMC), `src/lib/silk.js` (shader + ripple uniforms `uRip[6]` vec3 x,y,t), `src/lib/audio.js`, `src/lib/lazy.js`.
- [ ] `src/config.js` and full `hu.js` / `en.js` dictionaries.

### Task 5: Shell
- [ ] Intro overlay (language buttons, sound switch, countdown, sessionStorage skip), nav pill, HU/EN switch, sound toggle, dock / mobile bar, Lenis + anchor scrolling.

### Task 6: Hero
- [ ] Hero markup, cut-out portrait, GSAP reveal, results ticker; `laurel3d.js` (procedural leaves along two arcs, staggered growth, pointer tilt, visibility-gated render loop, SVG fallback).

### Task 7: Content sections
- [ ] About, treatments (cards + per-treatment WhatsApp text), training, contact (enquiry chips change WA text and mail subject), footer. Scroll reveals.

### Task 8: Championships
- [ ] Event cards from `config.events` + i18n; `medal3d.js` (lathe disc, canvas texture, ribbon, drag spin + spring swing, clink); `globe.js` (MapLibre globe, restyled dark tiles, arcs via `greatCircle`, animated head dot, markers, `flyTo`).

### Task 9: Gallery
- [ ] Filter chips, drag track (pointer events, momentum, velocity skew, Chromium displacement ripple), viewer dialog (focus trap, arrows, Esc, swipe, captions).

### Task 10: Studio map
- [ ] MapLibre mercator, 3D buildings in palette, fly-in + orbit while visible, panel with address/hours, "Bring me here" (Google/Apple chooser on phones), failure placeholder.

### Task 11: Finishing
- [ ] `favicon.svg`, `og.jpg` (generated from a portrait + wordmark), JSON-LD Person, `docs/CONTENT-TODO.md`, `README.md`.

### Task 12: Verify
- [ ] `npm test` passes; `npm run build` passes.
- [ ] Preview in the built-in browser via `.claude/launch.json`: desktop and phone widths, HU and EN, sound on/off, reduced motion; console clean. Fix what breaks.
