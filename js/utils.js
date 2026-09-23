/* utils.js — small stateless helpers used across the app */

const Utils = (() => {

  /** Local date as YYYY-MM-DD, never UTC-shifted. */
  function todayISO() {
    return dateToISO(new Date());
  }

  function dateToISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /** Parse YYYY-MM-DD into a local Date at midnight (avoids UTC parsing shift). */
  function isoToDate(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function formatDateLabel(iso) {
    const d = isoToDate(iso);
    const today = todayISO();
    const yestDate = new Date();
    yestDate.setDate(yestDate.getDate() - 1);
    const yesterday = dateToISO(yestDate);
    if (iso === today) return 'Today';
    if (iso === yesterday) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatDateShort(iso) {
    const d = isoToDate(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  function monthKey(iso) {
    return iso.slice(0, 7); // YYYY-MM
  }

  function monthLabel(monthKeyStr) {
    const [y, m] = monthKeyStr.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }

  function shiftMonth(monthKeyStr, delta) {
    const [y, m] = monthKeyStr.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function startOfWeekISO(iso) {
    const d = isoToDate(iso);
    const day = d.getDay(); // 0 = Sun
    const diff = (day === 0 ? -6 : 1) - day; // Monday as start
    d.setDate(d.getDate() + diff);
    return dateToISO(d);
  }

  /** Indian numbering format: 1,25,000 */
  function formatINR(amount) {
    const n = Math.round((Number(amount) || 0) * 100) / 100;
    const isNeg = n < 0;
    const abs = Math.abs(n);
    const parts = abs.toFixed(abs % 1 === 0 ? 0 : 2).split('.');
    let intPart = parts[0];
    let formatted;
    if (intPart.length <= 3) {
      formatted = intPart;
    } else {
      const last3 = intPart.slice(-3);
      const rest = intPart.slice(0, -3);
      formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
    }
    if (parts[1]) formatted += '.' + parts[1];
    return (isNeg ? '-' : '') + '₹' + formatted;
  }

  function uid(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined) node.setAttribute(k, v);
    }
    for (const child of [].concat(children)) {
      if (child === null || child === undefined) continue;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    }
    return node;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function debounce(fn, wait = 200) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function escapeHTML(str) {
    const d = document.createElement('div');
    d.textContent = str ?? '';
    return d.innerHTML;
  }

  return {
    todayISO, dateToISO, isoToDate, formatDateLabel, formatDateShort,
    monthKey, monthLabel, shiftMonth, startOfWeekISO,
    formatINR, uid, el, clamp, debounce, escapeHTML
  };
})();
