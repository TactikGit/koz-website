/* ════════════════════════════════════════════════════════════
   KOZ TRANSIT — V2 CONCEPT · minimal JS
   One signature motion (lane draw), mobile nav, honest quote form
   ════════════════════════════════════════════════════════════ */

/* ── Sticky header shadow ── */
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 20);
});

/* ── Mobile nav ── */
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
hamburger.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
});
navLinks.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => {
    navLinks.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  })
);

/* ── Live stats: hydrate the receipt fields.
      Source order: data/stats.json (fresh) → inline #statsFallback (baked into the page). ── */
if (document.querySelector('[data-stat]')) {
  const applyStats = s => {
    if (!s) return;
    const lang = localStorage.getItem('kozLang') || 'en';
    const locale = { en: 'en-CA', fr: 'fr-CA', es: 'es-MX' }[lang] || 'en-CA';
    document.querySelectorAll('[data-stat]').forEach(el => {
      const v = s[el.dataset.stat];
      if (typeof v === 'number') el.textContent = v.toLocaleString(locale);
    });
    document.querySelectorAll('[data-stat-date]').forEach(el => {
      el.textContent = (s.generated_at || '').slice(0, 10);
    });
  };
  const inlineStats = () => {
    try { return JSON.parse(document.getElementById('statsFallback').textContent); }
    catch (e) { return null; }
  };
  fetch('data/stats.json')
    .then(r => (r.ok ? r.json() : Promise.reject(new Error('http ' + r.status))))
    .then(applyStats)
    .catch(() => applyStats(inlineStats()));
}

/* ── Lane map: draw lanes when the map scrolls into view — with a timed
      backstop so the lanes can never stay hidden if the observer misfires ── */
const laneMap = document.querySelector('.lane-map');
if (laneMap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const lanes = laneMap.querySelectorAll('.lane');
  lanes.forEach(l => { l.style.strokeDasharray = 600; l.style.strokeDashoffset = 600; });
  let drawn = false;
  const drawLanes = () => {
    if (drawn) return;
    drawn = true;
    lanes.forEach((l, i) => {
      l.style.transition = `stroke-dashoffset 1.1s ease ${i * 0.1}s`;
      l.style.strokeDashoffset = 0;
    });
  };
  const mapObserver = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { drawLanes(); mapObserver.disconnect(); } });
  }, { threshold: 0.3 });
  mapObserver.observe(laneMap);
  setTimeout(drawLanes, 2500);
}

/* ── Quote form: builds a real email to dispatch (no fake backend) ── */
const quoteForm = document.getElementById('quoteForm');
if (quoteForm) quoteForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const v = id => document.getElementById(id).value.trim();
  const lang = (localStorage.getItem('kozLang') || 'en');
  const subjects = {
    en: 'Quote request — ' + v('qFrom') + ' to ' + v('qTo'),
    fr: 'Demande de soumission — ' + v('qFrom') + ' vers ' + v('qTo'),
    es: 'Solicitud de cotización — ' + v('qFrom') + ' a ' + v('qTo'),
  };
  const body = [
    'From / De: ' + v('qFrom'),
    'To / À: ' + v('qTo'),
    '',
    'Freight / Marchandise:',
    v('qWhat'),
    '',
    'Reply to / Répondre à: ' + v('qEmail') + (v('qPhone') ? ' · ' + v('qPhone') : ''),
  ].join('\n');
  window.location.href = 'mailto:dispatch@koz.co'
    + '?subject=' + encodeURIComponent(subjects[lang] || subjects.en)
    + '&body=' + encodeURIComponent(body);
});

/* ── Carrier registration form: same honest mailto pattern ── */
const carrierForm = document.getElementById('carrierForm');
if (carrierForm) carrierForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const v = id => (document.getElementById(id) || { value: '' }).value.trim();
  const equipment = [...carrierForm.querySelectorAll('.eq-item input:checked')]
    .map(c => c.value).join(', ');
  const body = [
    'Company / Carrier: ' + v('cName'),
    'Contact: ' + v('cContact'),
    'MC #: ' + v('cMC') + (v('cDOT') ? ' · DOT #: ' + v('cDOT') : ''),
    'Home base / region: ' + v('cBase'),
    'Trucks: ' + v('cTrucks'),
    'Equipment: ' + (equipment || 'n/a'),
    '',
    'Preferred lanes / notes:',
    v('cNotes'),
    '',
    'Reply to: ' + v('cEmail') + (v('cPhone') ? ' · ' + v('cPhone') : ''),
  ].join('\n');
  window.location.href = 'mailto:dispatch@koz.co'
    + '?subject=' + encodeURIComponent('Carrier registration — ' + v('cName') + ' (MC ' + v('cMC') + ')')
    + '&body=' + encodeURIComponent(body);
});
