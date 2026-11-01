export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
}
export function formatNumber(value) { return Number(value || 0).toLocaleString(); }
export function navigate(moduleId) { window.dispatchEvent(new CustomEvent('gv:navigate', { detail: moduleId })); }
export function refresh() { window.dispatchEvent(new CustomEvent('gv:refresh')); }
export function showToast(message, type = 'success') {
  window.dispatchEvent(new CustomEvent('gv:toast', { detail: { message, type } }));
}
export function pageHeader(eyebrow, title, description, right = '') {
  return `<div class="page-heading"><div><div class="eyebrow">${escapeHtml(eyebrow)}</div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div>${right ? `<div class="page-heading-right">${right}</div>` : ''}</div>`;
}
export function badge(label, tone = 'teal') { return `<span class="badge badge-${escapeHtml(tone)}">${escapeHtml(label)}</span>`; }
export function sequenceStrip(sequence, { start = 0, changed = [], compact = false, limit = 90 } = {}) {
  const dna = sequence.slice(start, start + limit);
  return `<div class="sequence-strip ${compact ? 'compact' : ''}" aria-label="DNA sequence">${[...dna].map((base, i) => `<span class="nucleotide n-${base}" title="Position ${start + i + 1}${changed.includes(start + i) ? ', changed' : ''}" ${changed.includes(start + i) ? 'data-changed="true"' : ''}>${escapeHtml(base)}</span>`).join('')}${sequence.length > start + limit ? '<span class="sequence-ellipsis">…</span>' : ''}</div>`;
}
