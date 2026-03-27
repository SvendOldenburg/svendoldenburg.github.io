/* ============================================
   SVEND OLDENBURG — SITE JS
   Scroll reveals, nav behavior, mobile menu
   ============================================ */

(function () {
  'use strict';

  // --- Scroll Reveal (Intersection Observer) ---
  const reveals = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px',
    }
  );

  reveals.forEach((el) => revealObserver.observe(el));

  // --- Nav scroll behavior ---
  const nav = document.getElementById('nav');
  let lastScroll = 0;

  function handleNavScroll() {
    const scrollY = window.scrollY;
    if (scrollY > 80) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
    lastScroll = scrollY;
  }

  window.addEventListener('scroll', handleNavScroll, { passive: true });

  // --- Mobile menu ---
  const toggle = document.getElementById('navToggle');
  const overlay = document.getElementById('navOverlay');

  if (toggle && overlay) {
    toggle.addEventListener('click', () => {
      const isOpen = overlay.classList.contains('open');
      overlay.classList.toggle('open');
      toggle.classList.toggle('active');
      toggle.setAttribute('aria-expanded', !isOpen);
      document.body.style.overflow = isOpen ? '' : 'hidden';
    });

    overlay.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        overlay.classList.remove('open');
        toggle.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  // --- Smooth scroll for anchor links ---
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
})();
