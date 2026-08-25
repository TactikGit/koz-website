/* ============================================================
   KOZ TRANSIT — Language Switcher
   Stores choice in localStorage, applies on every page load
   ============================================================ */

function setLang(l) {
  document.documentElement.className = 'lang-' + l;
  document.documentElement.setAttribute('lang', l);
  localStorage.setItem('kozLang', l);

  document.querySelectorAll('.lang-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.lang === l);
  });
}

(function () {
  var saved = localStorage.getItem('kozLang') || 'en';
  setLang(saved);
})();
