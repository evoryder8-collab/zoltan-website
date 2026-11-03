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

/**
 * Keeps something heavy (a map) alive only around el: mount() once it comes
 * within `near` of the viewport, unmount() once it is more than `far` away,
 * so a phone never holds two maps at once. Without `far` it stays for good.
 * With `far`, a fling straight past doesn't build it: it has to stay near a
 * moment first.
 */
export function whileNear(el, { mount, unmount, near = '600px', far = null }) {
  if (!el) return;
  let alive = false;
  let soon = 0;
  new IntersectionObserver((entries) => {
    const close = entries.at(-1).isIntersecting;
    clearTimeout(soon);
    if (alive || !close) return;
    soon = setTimeout(() => {
      alive = true;
      mount();
    }, far ? 350 : 0);
  }, { rootMargin: near }).observe(el);
  if (!far) return;
  new IntersectionObserver((entries) => {
    if (alive && !entries.at(-1).isIntersecting) {
      alive = false;
      unmount();
    }
  }, { rootMargin: far }).observe(el);
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
