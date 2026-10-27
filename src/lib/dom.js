export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const BRACKET = /\[[^\]]+\]/;

/** Wraps [placeholder] text in <span class="ph"> so it reads as unfinished. */
export function markPlaceholders(root = document.body) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      BRACKET.test(n.nodeValue) && !n.parentElement.closest('.ph, script, style, textarea, title') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const frag = document.createDocumentFragment();
    node.nodeValue.split(/(\[[^\]]+\])/).forEach((part) => {
      if (!part) return;
      if (BRACKET.test(part)) {
        const span = document.createElement('span');
        span.className = 'ph';
        span.textContent = part;
        frag.append(span);
      } else frag.append(part);
    });
    node.replaceWith(frag);
  }
}

/** Fades [data-reveal] elements in as they scroll into view, staggered per parent. */
export function initReveals({ reduced }) {
  const els = [...document.querySelectorAll('[data-reveal]')];
  if (reduced) {
    els.forEach((el) => el.classList.add('is-revealed'));
    return { observe() {} };
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-revealed');
        io.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  const observe = (list) => {
    const byParent = new Map();
    list.forEach((el) => {
      const k = el.parentElement;
      const n = byParent.get(k) || 0;
      byParent.set(k, n + 1);
      el.style.setProperty('--d', `${Math.min(n, 6) * 0.08}s`);
      io.observe(el);
    });
  };
  observe(els);
  return { observe };
}
