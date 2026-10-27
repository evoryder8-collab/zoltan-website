const digits = (n) => String(n).replace(/\D/g, '');

export const waLink = (number, text = '') =>
  `https://wa.me/${digits(number)}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

export const telLink = (number) => `tel:+${digits(number)}`;

export function mailLink(email, subject = '', body = '') {
  const q = [];
  if (subject) q.push(`subject=${encodeURIComponent(subject)}`);
  if (body) q.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${email}${q.length ? `?${q.join('&')}` : ''}`;
}
