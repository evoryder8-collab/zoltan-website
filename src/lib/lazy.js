/** Calls loader once, when el comes within `margin` of the viewport. */
export function whenNear(el, loader, margin = '600px') {
  if (!el) return;
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        loader();
      }
    },
    { rootMargin: margin },
  );
  io.observe(el);
}

/** Tracks whether el is on screen; returns a getter. */
export function visibility(el, onChange) {
  let on = false;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      on = e.isIntersecting;
      onChange?.(on);
    }
  });
  io.observe(el);
  return () => on;
}
