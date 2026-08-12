/* ===================================================================
   Lucía Ferrer — Portafolio · lógica de interacción
   Todo el código respeta prefers-reduced-motion y funciona sin
   dependencias externas.
   =================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Año dinámico en el footer ---------- */
  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- Header: se oscurece y marca borde al hacer scroll ---------- */
  const header = document.getElementById("siteHeader");
  const setHeaderState = () => header.classList.toggle("is-scrolled", window.scrollY > 12);
  setHeaderState();
  window.addEventListener("scroll", setHeaderState, { passive: true });

  /* ---------- Menú móvil ---------- */
  const navToggle = document.getElementById("navToggle");
  const primaryNav = document.getElementById("primaryNav");

  const closeMenu = () => {
    navToggle.setAttribute("aria-expanded", "false");
    primaryNav.classList.remove("is-open");
  };

  navToggle.addEventListener("click", () => {
    const isOpen = primaryNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  // Cierra el menú al elegir un enlace (evita que quede abierto tras navegar)
  primaryNav.querySelectorAll(".nav-link, .nav-cta").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  /* ---------- Resalta el enlace de la sección visible ---------- */
  const navLinks = Array.from(document.querySelectorAll(".nav-link"));
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = `#${entry.target.id}`;
        navLinks.forEach((link) => {
          link.classList.toggle("is-active", link.getAttribute("href") === id);
        });
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  sections.forEach((section) => sectionObserver.observe(section));

  /* ---------- Animación de aparición al hacer scroll ---------- */
  const revealTargets = document.querySelectorAll(
    ".capability-card, .project-card, .section-head"
  );
  revealTargets.forEach((el) => el.classList.add("reveal"));

  if (prefersReducedMotion) {
    revealTargets.forEach((el) => el.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealTargets.forEach((el) => revealObserver.observe(el));
  }

  /* ---------- Efecto de máquina de escribir en el hero ---------- */
  const roleEl = document.getElementById("roleTyper");
  const roles = ["Frontend", "Backend", "Cloud & DevOps", "Arquitectura de datos"];

  if (prefersReducedMotion) {
    roleEl.textContent = roles[0];
  } else {
    let roleIndex = 0;
    let charIndex = 0;
    let deleting = false;

    const tick = () => {
      const current = roles[roleIndex];
      charIndex += deleting ? -1 : 1;
      roleEl.textContent = current.slice(0, charIndex);

      let delay = deleting ? 45 : 75;

      if (!deleting && charIndex === current.length) {
        delay = 1400;
        deleting = true;
      } else if (deleting && charIndex === 0) {
        deleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
        delay = 300;
      }

      setTimeout(tick, delay);
    };

    tick();
  }
});
