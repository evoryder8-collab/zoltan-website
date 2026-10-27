# Zoltan website: design

Date: 2026-10-27 · Status: approved by the user

## Who and why

Zoltan is a Hungarian massage therapist and championship competitor (AusMC 2026, EMC 2026, IMA 2026, an event in Slovakia). The site does four jobs, in this order of visibility:

1. **Bookings.** Clients in Hungary book by phone or WhatsApp. No booking system, no forms.
2. **Showcase.** Titles, award moments, competition photography.
3. **Training.** A short pitch for teaching other therapists, with an enquiry button. No course list, no payments.
4. **Enquiries.** Media, sponsors, events.

One studio in Hungary (city and address to come). Languages: Hungarian and English.

## Look: "Crimson & White"

Taken from Zoltan's own photos: all-white kit, red World Championship banner, white laurel. Related to HubertMak.com (dark, cinematic, serif, numbered sections, language intro) without copying it: no gold, a different typeface, a different signature motif.

- **Palette:** wine-black base `#0b0607`, championship crimson `#c3122f`, ember glow `#ff3b4e`, pearl text `#f6f1ec`, muted pearl `#bdb3ab`. Hungarian red-white-green appears only on the medal ribbon and flag photos.
- **Type:** Bodoni Moda (headings, high-contrast editorial serif) and Manrope (body, UI). Both bundled via `@fontsource`, with latin-ext for ő and ű.
- **Signature motif:** the laurel. A 3D laurel wreath frames the hero portrait, and a single laurel leaf marks each section kicker.
- **Liquid glass:** panels, chips, nav and buttons use AusMC's glass recipe (blur + saturate, conic rim light, pointer-tracked specular, SVG displacement lens on Chromium desktop).

## Stack

Vite + vanilla JS (same shape as the AusMC landing page). GSAP (+ ScrollTrigger), Lenis smooth scroll, three.js, MapLibre GL with OpenFreeMap tiles, Web Audio for all sound. Vitest for the pure logic. Static `dist/` output, hostable anywhere. No deploy in this phase.

## Page, top to bottom

0. **Intro overlay.** Silk background, laurel assembling, glass card with the wordmark, two language buttons (Magyar / English) and a "with sound" toggle (off by default). The browser's language is highlighted and auto-enters after a short countdown; any input pauses it. Shown fully once per session; later visits in the same session skip straight in.
1. **Nav.** Glass pill: wordmark, section links, HU/EN switch, sound toggle, "Book" button.
2. **Hero.** Cut-out portrait inside the 3D laurel, name, "Award-winning massage therapist · [City], Hungary", Call + WhatsApp buttons, glass chips with headline titles.
3. **Results ticker.** Looping marquee of titles and events.
4. **About.** Bio and a pull quote (placeholders).
5. **Treatments.** Glass cards: name, short description, duration, price in HUF. "Book on WhatsApp" opens a chat prefilled with that treatment in the visitor's language.
6. **Championships.** The 3D medal, then one glass card per event with title, category and city. Cards drive the globe.
7. **Globe.** MapLibre globe in crimson/black, glowing great-circle arcs from Hungary to each event with a known location. Clicking a card flies the globe to that event.
8. **Gallery.** Category chips (Treatment, Stretch, Awards, Portraits), a drag/swipe track with momentum and velocity-driven skew (plus a displacement ripple on Chromium desktop), and a full-screen glass viewer with captions, arrows, swipe and keyboard.
9. **Training.** Short pitch and "Enquire" (WhatsApp or email).
10. **Contact.** Phone, WhatsApp, email, hours. Enquiry chips (Booking, Training, Media, Sponsorship) set the WhatsApp text and email subject. Studio map: MapLibre with 3D buildings, fly-in and slow orbit, "Bring me here" (Google Maps / Apple Maps chooser on phones).
11. **Footer.** Wordmark, socials, back to top.
12. **Dock.** Floating WhatsApp + Call buttons; a sticky bottom bar on phones.

## Interactive layers

- **Silk background** (`lib/silk.js`): fixed full-screen WebGL canvas, domain-warped noise in the palette, reduced resolution, ~30 fps, paused when the tab is hidden. Pointer or touch down sends a warm ripple through it (up to 6 at once). Fallback: CSS gradients.
- **3D laurel** (`components/laurel3d.js`): procedural three.js wreath, two branches of pearl leaves (clearcoat, sheen) lit by crimson rims and a warm key. Leaves grow in one by one, then the wreath tilts toward the pointer. Renders only while visible. Fallback: SVG laurel.
- **3D medal** (`components/medal3d.js`): procedural medal (lathe-turned disc, laurel and "Z" on a canvas texture) on a red-white-green ribbon. Drag to spin with inertia; it swings back with spring physics; a clink plays on fast spins and taps.
- **Sound** (`lib/audio.js`): synthesised, no audio files. Tap, soft hover tick, laurel-complete chime, medal clink, globe whoosh, silk ripple, optional quiet ambient pad. Off until the visitor opts in; the choice is remembered.
- **Reduced motion:** no intro animation, a still silk frame, laurel and medal static, no orbit, no auto-scrolling ticker.
- **Loading:** three.js and MapLibre are dynamic imports, loaded when their section nears the viewport.

## Content and data

- `src/i18n/hu.js`, `src/i18n/en.js`: every visible string, including treatments, event cards, gallery captions, alt text and meta tags. `src/i18n/index.js` exposes `t(key)`, `setLang(lang)` and applies `data-i18n` attributes. Missing keys fall back to English, then to the key.
- `src/config.js`: phone, WhatsApp number, email, socials, studio address and coordinates, prices, event list with coordinates.
- Language choice: `?lang=` in the URL, then a saved choice, then the browser language (`hu*` → Hungarian, else English). Switching updates `<html lang>`, title and meta description without a reload.
- **Placeholders:** shown as `[like this]` and listed in `docs/CONTENT-TODO.md`. Nothing invented is presented as fact.
- **Known facts used:** event names and cities (AusMC 2026, Cockatoo Island, Sydney; EMC 2026, Paris). AusMC 2026 titles confirmed by the user from the award boards: **Overall Winner** and **Freestyle Massage Award** (prize amounts left out).

## Assets (copied into `public/img/`, resized to WebP)

- Hero cut-outs: `Zoltan IMA/ara/transparent portrait zoltan.png`, `zoltan standing transparent.png` (alpha WebP, 1600 px tall plus a 900 px variant).
- IMA portraits: `Zoltan IMA/ara/0E7A0547-2-retouched.jpg`, `0E7A0570-2-retouched lips fixed.jpg`.
- In-action shot: `clients copenhagen/Zoltan.webp` (event logo kept).
- AusMC gallery: 20 graded proofs from `LR Editing via Agent/analysis/ausmc-zoltan-grade-matthew-2026-10-13/z-final-proof/` (list in the plan), approved by the user.
- Gallery images ship at 800 px and 1600 px on the long edge.

Not used (not approved): logo animation, reels and award videos, interview subtitles.

## Error handling and fallbacks

- No WebGL: CSS silk gradient, SVG laurel, flat medal image, static map image with a directions link.
- Map tiles fail to load: the panel keeps address, hours and "Bring me here"; the map area shows a calm placeholder.
- Audio blocked or unsupported: sound toggle hidden; nothing else changes.
- Missing translation key: English, then the key itself, logged once in dev.

## Testing and verification

- Vitest for pure logic: language detection, `t()` fallback, WhatsApp/mailto link builders, great-circle arc points.
- `npm run build` succeeds with no warnings that matter.
- Preview in the built-in browser at desktop and phone widths, in both languages, with sound on and off, and with reduced motion. Console free of errors.

## Out of scope for now

Online payments, a course catalogue, a booking calendar, a CMS, analytics, deployment, a custom domain.

## Update, 2026-10-27: details from Zoltan

These replace the earlier assumptions about treatments and the single studio.

- **Brand line:** "Clinical Precision • Aesthetic Flow." Used in the intro, hero, ticker, footer and share image, in English in both languages.
- **One personalised treatment, not a menu.** Methods are chosen after consultation and assessment. About 70 minutes; fixed price, never extra if it runs longer. The treatment section now shows three steps (consultation, assessment, treatment), the duration and fixed-price note, one price card per location with its own WhatsApp booking, and the toolkit.
- **Two locations:** Budapest (20,000 HUF) and Mezőkeresztes (14,000 HUF). Contact lists both; the studio map has a switch between them and "Bring me here" follows the selection. Exact addresses are still placeholders.
- **Toolkit:** therapeutic and Swedish massage, FDM (Fascial Distortion Model), trigger point techniques, cupping, IASTM, kinesiology taping, scar tissue treatment, vagus therapy, mobilization techniques.
