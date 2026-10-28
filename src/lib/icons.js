// Inline stroke icons (24px grid). Elements with data-icon="name" are filled
// in by fillIcons(); components can also call icon(name) directly.
const P = {
  whatsapp:
    '<path d="M3.6 20.4l1.25-4.1a8.6 8.6 0 1 1 3.2 3.1z"/><path d="M9.1 8.3c.25-.55.6-.6.95-.6l1 2.05c0 .35-.25.65-.6 1 .55 1.15 1.45 2.05 2.6 2.6.35-.35.65-.6 1-.6l2.05 1c0 .35-.05.7-.6.95-.85.45-2.1.4-3.45-.35a8.4 8.4 0 0 1-2.95-2.95c-.75-1.35-.8-2.6-.35-3.45z" fill="currentColor" stroke="none"/>',
  phone:
    '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.96.35 1.9.7 2.8a2 2 0 0 1-.45 2.1L8.1 9.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.1-.45c.9.35 1.84.6 2.8.7A2 2 0 0 1 22 16.9z"/>',
  mail: '<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="M3 6.5l9 6.5 9-6.5"/>',
  pin: '<path d="M12 21.5s-7-6.1-7-11.5a7 7 0 0 1 14 0c0 5.4-7 11.5-7 11.5z"/><circle cx="12" cy="10" r="2.6"/>',
  nav: '<path d="M3 11l18-8-8 18-2-8z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  left: '<path d="M15 5l-7 7 7 7"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
  up: '<path d="M5 15l7-7 7 7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  drag: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M4 12h16"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  check: '<path d="M4.5 12.5l5 5 10-11"/>',
  play: '<path d="M7 4.8v14.4a.8.8 0 0 0 1.2.7l11.6-7.2a.8.8 0 0 0 0-1.4L8.2 4.1A.8.8 0 0 0 7 4.8z" fill="currentColor" stroke="none"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  replay: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4v4.5H8"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none"/>',
  facebook: '<path d="M14.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4a21 21 0 0 0-2.4-.1c-2.4 0-4 1.4-4 4.1v2.1H8.6v3h2.6V21"/>',
  tiktok: '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.5 2.6 2.2 4.2 5 4.5"/>',
  youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10.2 9.2l4.6 2.8-4.6 2.8z" fill="currentColor" stroke="none"/>',
  contact: '<rect x="3" y="4.5" width="18" height="15" rx="3"/><circle cx="9" cy="10.6" r="2.3"/><path d="M5.6 16.4c.6-1.7 1.9-2.6 3.4-2.6s2.8.9 3.4 2.6M14.5 10h3.5M14.5 13.5h3.5"/>',
  share: '<path d="M12 3.5v11.5M7.5 8 12 3.5 16.5 8"/><path d="M5 12.5V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6.5"/>',
  copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 8.5V6A2.5 2.5 0 0 0 13 3.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5"/>',
  go: '<path d="M7 17 17 7M9 7h8v8"/>',
  trophy: '<path d="M7.5 4h9v5.5a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 6h-3a3 3 0 0 0 3 3.5M16.5 6h3a3 3 0 0 1-3 3.5M12 14v3.5M8.5 20.5h7"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="9.5" r="1.8"/><path d="M21 15.5l-5-5-9 9.5"/>',
  spark: '<path d="M12 3c.8 4.2 2.8 6.2 7 7-4.2.8-6.2 2.8-7 7-.8-4.2-2.8-6.2-7-7 4.2-.8 6.2-2.8 7-7z"/><path d="M19 16.5v4M17 18.5h4"/>',
  cap: '<path d="M2.5 8.5 12 4l9.5 4.5L12 13z"/><path d="M6.5 10.6V15c0 1.4 2.5 2.7 5.5 2.7s5.5-1.3 5.5-2.7v-4.4M21.5 8.5V14"/>',
  pause: '<path d="M9 5.5v13M15 5.5v13"/>',
  sound:
    '<path class="spk__body" d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4c.37 0 .73.15 1 .41l3.4 3.39a.7.7 0 0 0 1.2-.5z"/><path class="spk__w spk__w1" d="M16 9a5 5 0 0 1 0 6"/><path class="spk__w spk__w2" d="M19.4 18.4a9 9 0 0 0 0-12.7"/><path class="spk__slash" d="M3.5 3.5l17 17"/>',
};

export const icon = (name) =>
  `<svg class="i i--${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;

export function fillIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    if (!el.querySelector(':scope > svg.i')) el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon));
  });
}
