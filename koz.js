/* ════════════════════════════════════════════════════════════
   KOZ TRANSIT — V2 CONCEPT · minimal JS
   Mobile nav, live stats, lane-draw signature motion
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

/* view-transition support flag (suppresses the CSS fallback entrance) */
if (document.startViewTransition) document.documentElement.classList.add('vt');

/* ── Mark the current page in the nav ── */
const herePage = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a').forEach(a => {
  const target = (a.getAttribute('href') || '').split('#')[0];
  if (target && target === herePage) { a.classList.add('active'); a.setAttribute('aria-current', 'page'); }
});

/* ── Prefetch same-site pages on hover so navigation lands instantly ── */
const prefetched = new Set();
document.addEventListener('mouseover', e => {
  const a = e.target.closest('a');
  if (!a) return;
  const href = a.getAttribute('href') || '';
  if (!href.endsWith('.html') || href.includes('//') || prefetched.has(href)) return;
  prefetched.add(href);
  const l = document.createElement('link');
  l.rel = 'prefetch'; l.href = href;
  document.head.appendChild(l);
});

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
