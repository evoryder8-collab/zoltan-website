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
  { id: 'budapest', price: { eur: 70, huf: 22000 }, lngLat: [19.17397, 47.51038], query: 'Sashalom, Budapest XVI. kerület' },
  { id: 'mezokeresztes', price: { eur: 50, huf: 16000 }, lngLat: [20.68864, 47.82599], query: 'Mezőkeresztes, Bornemissza u. 3, 3441' },
];

// Where the arcs on the championship globe start
export const HOME = { lngLat: [19.0402, 47.4979] };

// Championships, most recent first: wording in i18n under champs.events.<id>.
// The Slovakia championship's city isn't published, so its pin marks the country.
export const EVENTS = [
  { id: 'ausmc26', lngLat: [151.1717, -33.8477], featured: true },
  { id: 'slovakia', lngLat: [19.699, 48.669], featured: true },
];
