// Everything about Zoltan that is a fact rather than wording: contact details,
// locations, prices and events. Wording for both languages lives in src/i18n/;
// open questions are in docs/CONTENT-TODO.md.

// From zwellness.hu (Z-Wellness, Kódor Zoltán e.v.)
export const CONTACT = {
  phone: '+36 30 416 2043',
  whatsapp: '+36 30 416 2043', // assumed to be the same number as the phone
  email: 'zwellness18@gmail.com',
  socials: {
    instagram: 'https://www.instagram.com/zwellness18/', // empty ones are hidden
    facebook: 'https://www.facebook.com/zwellness18',
    tiktok: 'https://www.tiktok.com/@zwellness18',
    youtube: 'https://www.youtube.com/@zwellness18',
  },
};

// One personalised treatment: methods are chosen after consultation and
// assessment. Fixed price; never extra if it runs longer.
export const TREATMENT = { minutes: 70 };

// Prices are shown in euros; in Hungarian his forint price follows beneath.
// The euros are set above the forints (22 000 Ft was about €60 at the ECB
// rate of 28 Oct 2026), so paying in forints comes out cheaper, as paying in
// euros costs more in conversion fees.

// Where Zoltan works, with the price at each. Names and addresses live in
// i18n under locations.<id>; `query` is what Google/Apple Maps search for.
// Budapest is only published as a district (Sashalom), so its pin marks the area.
export const LOCATIONS = [
  { id: 'budapest', price: { eur: 65, huf: 22000 }, lngLat: [19.17397, 47.51038], query: 'Sashalom, Budapest XVI. kerület' },
];

// Where the arcs on the championship globe start
export const HOME = { lngLat: [19.0402, 47.4979] };

// Every championship Zoltan has entered or is entered for, in date order,
// all pinned on the globe: wording in i18n under champs.events.<id>. `end` is
// its last day; until then the globe shows it as upcoming. Events in the same
// city share one pin; `featured` marks an overall title. The Slovakia
// championship's city isn't published, so its pin marks the country.
const COPENHAGEN = [12.5683, 55.6761];
export const EVENTS = [
  { id: 'emc26', end: '2026-05-24', lngLat: [2.3522, 48.8566] },
  { id: 'wcm26', end: '2026-07-05', lngLat: COPENHAGEN }, // early July; the exact days aren't published
  { id: 'slovakia', end: '2026-09-12', lngLat: [19.699, 48.669], featured: true },
  { id: 'ausmc26', end: '2026-10-11', lngLat: [151.1717, -33.8477], featured: true },
  { id: 'wmsc26', end: '2026-11-01', lngLat: [24.1256, 45.7983] },
  { id: 'seamc27', end: '2027-01-17', lngLat: [100.3327, 5.4141] },
  { id: 'newma27', end: '2027-01-24', lngLat: [98.3923, 7.8804] },
  { id: 'phlwms27', end: '2027-04-18', lngLat: [120.9842, 14.5995] },
  { id: 'obmc27', end: '2027-05-16', lngLat: [25.6172, 43.0757] },
  { id: 'mcwt27', end: '2027-05-27', lngLat: [139.6917, 35.6895] },
  { id: 'wcm27', end: '2027-07-04', lngLat: COPENHAGEN },
];

// The championships with a card under the medal, overall titles first
export const CARDS = ['ausmc26', 'slovakia', 'wmsc26'];
