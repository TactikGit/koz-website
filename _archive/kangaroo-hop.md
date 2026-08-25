# Archived: kangaroo hop entrance animation

Removed from the V2 homepage on 2026-08-19 at Youri's request ("remove that round logo for now").
Kept here so it can be restored in one paste if the kangaroo comes back.

## HTML (place between `.hero-meta` and the `<h1>` in V2/index.html)

```html
<img class="hero-kangaroo" src="../LOGO/SVG/Kangourou.svg" alt="" aria-hidden="true" />
```

## CSS (was in V2/koz.css, hero section)

```css
.hero-kangaroo {
  display: block;
  width: clamp(70px, 10vw, 130px);
  margin-bottom: 0.9rem;
  opacity: 0.9;
  transform: rotate(-4deg);
}

/* Kangaroo entrance — enters from the right (it faces left), hops across the hero,
   lands at its perch above the headline. First landing of the session only. */
@media (prefers-reduced-motion: no-preference) {
  .hero-kangaroo.hop {
    animation: kangaroo-hop 2s cubic-bezier(0.4, 0.1, 0.5, 0.9) 0.25s both;
    transform-origin: 50% 100%;
    will-change: transform;
  }
  @keyframes kangaroo-hop {
    0%   { transform: translate(74vw, -110px) rotate(-10deg); opacity: 0; }
    7%   { opacity: 0.9; }
    18%  { transform: translate(52vw, 0) rotate(0deg) scale(1.1, 0.86); }        /* land 1 — squash */
    24%  { transform: translate(47vw, -24px) rotate(-4deg) scale(0.96, 1.06); }  /* push off */
    40%  { transform: translate(28vw, -100px) rotate(-8deg) scale(1, 1); }       /* apex */
    56%  { transform: translate(10vw, 0) rotate(2deg) scale(1.09, 0.88); }       /* land 2 — squash */
    63%  { transform: translate(8vw, -14px) rotate(-2deg) scale(0.97, 1.04); }
    80%  { transform: translate(1vw, -36px) rotate(-4deg); }                     /* last little hop */
    92%  { transform: translate(0, 0) rotate(-2deg) scale(1.06, 0.92); }         /* touchdown */
    100% { transform: translate(0, 0) rotate(-4deg) scale(1, 1); }               /* rest */
  }
}

/* mobile (inside the max-width: 900px block) */
.hero-kangaroo { width: 56px; margin-bottom: 0.6rem; }
```

## JS (was in V2/koz.js)

```js
/* ── Kangaroo entrance: hop in on the first landing of this session ── */
const kangaroo = document.querySelector('.hero-kangaroo');
if (kangaroo && !sessionStorage.getItem('kozHopped')) {
  kangaroo.classList.add('hop');
  sessionStorage.setItem('kozHopped', '1');
}
```

Note: the mark faces LEFT, so any entrance must travel right-to-left (or the final
perch must be reached moving leftward) or the kangaroo hops backwards.
