// Everything about Zoltan that is a fact rather than wording: contact details,
// locations, prices and events. Values in [brackets] are placeholders; see
// docs/CONTENT-TODO.md. Wording for both languages lives in src/i18n/.

export const CONTACT = {
  phone: '+36 00 000 0000', // [placeholder] shown and dialled as-is
  whatsapp: '+36 00 000 0000', // [placeholder] international format
  email: 'hello@example.com', // [placeholder]
  socials: {
    instagram: '', // full URLs; empty ones are hidden
    facebook: '',
    tiktok: '',
    youtube: '',
  },
};

// One personalised treatment: methods are chosen after consultation and
// assessment. Fixed price; never extra if it runs longer.
export const TREATMENT = { minutes: 70 };

// Where Zoltan works, with the price at each. Names and addresses live in
// i18n under locations.<id>. Coordinates are town centres until the exact
// studio addresses are known (placeholder: true).
export const LOCATIONS = [
  { id: 'budapest', price: 20000, lngLat: [19.0402, 47.4979], query: 'Budapest, Hungary', placeholder: true },
  { id: 'mezokeresztes', price: 14000, lngLat: [20.6905, 47.8278], query: 'Mezőkeresztes, Hungary', placeholder: true },
];

// Where the arcs on the championship globe start
export const HOME = { lngLat: [19.0402, 47.4979] };

// Championships: wording in i18n under champs.events.<id>. Events without
// coordinates still get a card but no arc on the globe.
export const EVENTS = [
  { id: 'ausmc26', lngLat: [151.1717, -33.8477], featured: true },
  { id: 'emc26', lngLat: [2.3522, 48.8566] },
  { id: 'ima26', lngLat: null }, // [placeholder] city unknown
  { id: 'slovakia', lngLat: null }, // [placeholder] event and city unknown
];
