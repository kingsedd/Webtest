/* ===================================================================
   Unbox Me! — lógica de interacción
   Sitio 100% estático: el cotizador calcula en el navegador, y el
   pedido/rastreo se simulan guardando los envíos generados en
   localStorage (no hay backend real detrás). Todo respeta
   prefers-reduced-motion.
   =================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const STORAGE_KEY = "unboxme_orders";

  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- Header dinámico ---------- */
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
  primaryNav.querySelectorAll(".nav-link, .nav-cta").forEach((link) => link.addEventListener("click", closeMenu));

  /* ---------- Enlace activo según sección visible ---------- */
  const navLinks = Array.from(document.querySelectorAll(".nav-link"));
  const sections = navLinks.map((l) => document.querySelector(l.getAttribute("href"))).filter(Boolean);
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = `#${entry.target.id}`;
        navLinks.forEach((l) => l.classList.toggle("is-active", l.getAttribute("href") === id));
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  sections.forEach((s) => sectionObserver.observe(s));

  /* ---------- Aparición al hacer scroll ---------- */
  const revealTargets = document.querySelectorAll(".perk, .quote-card, .order-card, .testimonial-card, .section-head");
  revealTargets.forEach((el) => el.classList.add("reveal"));
  if (prefersReducedMotion) {
    revealTargets.forEach((el) => el.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealTargets.forEach((el) => revealObserver.observe(el));
  }

  /* =================================================================
     Utilidades: dinero, hash determinista y orden simulado
     ================================================================= */
  const money = (n) => `$${n.toLocaleString("es-PA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;

  const hashCode = (str) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  };

  const readOrders = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  };
  const writeOrders = (orders) => localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));

  const STAGES = ["Recibido en Miami", "En tránsito a Panamá", "En reparto", "Entregado"];
  const STAGE_META = {
    "Recibido en Miami": "Bodega Unbox Me! — Miami, FL",
    "En tránsito a Panamá": "En camino hacia Ciudad de Panamá",
    "En reparto": "Con el mensajero, en camino a tu dirección",
    "Entregado": "Recibido por el destinatario",
  };

  const formatDate = (d) => d.toLocaleDateString("es-PA", { day: "2-digit", month: "short" });

  /* Construye una línea de tiempo de 4 etapas. `progress` = índice de la
     etapa actual (0 a 3). `anchorDate` = fecha del pedido/base. */
  const buildTimeline = (progress, anchorDate) => {
    return STAGES.map((stage, i) => {
      const date = new Date(anchorDate);
      date.setDate(date.getDate() + i);
      let status = "upcoming";
      if (i < progress) status = "done";
      if (i === progress) status = "current";
      return { stage, date, status, meta: STAGE_META[stage] };
    });
  };

  const renderTimeline = (code, entries) => {
    document.getElementById("trackCode").textContent = code;
    const current = entries.find((e) => e.status === "current") || entries[entries.length - 1];
    document.getElementById("trackStatusPill").textContent = current.stage;

    const list = document.getElementById("timeline");
    list.innerHTML = "";
    entries.forEach((entry) => {
      const li = document.createElement("li");
      if (entry.status === "done") li.classList.add("is-done");
      if (entry.status === "current") li.classList.add("is-current");
      li.innerHTML = `
        <p class="timeline-title">${entry.stage}</p>
        <p class="timeline-meta">${formatDate(entry.date)} · ${entry.meta}</p>
      `;
      list.appendChild(li);
    });

    document.getElementById("trackResult").hidden = false;
  };

  /* =================================================================
     Cotizador: $3.00 por libra, mínimo $5.00 para 1 lb o menos
     ================================================================= */
  const quoteForm = document.getElementById("quoteForm");
  quoteForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const weight = parseFloat(document.getElementById("qWeight").value) || 0;

    const ratePerLb = 3.0;
    const minimumCharge = 5.0;
    const total = Math.max(weight * ratePerLb, minimumCharge);

    document.getElementById("quotePrice").textContent = money(total);

    const breakdown = document.getElementById("quoteBreakdown");
    breakdown.innerHTML = `
      <li><span>Peso estimado</span><span>${weight.toFixed(1)} lb</span></li>
      <li><span>Tarifa</span><span>${money(ratePerLb)} / lb</span></li>
      <li><span>Cargo mínimo</span><span>${money(minimumCharge)}</span></li>
    `;

    document.getElementById("quoteResult").hidden = false;
    document.getElementById("quoteResult").scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "nearest" });
  });

  /* =================================================================
     Pedido en línea: genera un código y guarda el envío simulado
     ================================================================= */
  const orderForm = document.getElementById("orderForm");
  orderForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("oName").value.trim();
    const pickupDateValue = document.getElementById("oDate").value;
    const anchorDate = pickupDateValue ? new Date(pickupDateValue) : new Date();

    const code = `UB-${Math.floor(100000 + Math.random() * 900000)}`;

    const orders = readOrders();
    orders[code] = {
      name,
      contact: document.getElementById("oContact").value.trim(),
      pickup: document.getElementById("oPickup").value.trim(),
      dropoff: document.getElementById("oDropoff").value.trim(),
      type: document.getElementById("oType").value,
      anchorDate: anchorDate.toISOString(),
      progress: 0,
    };
    writeOrders(orders);

    document.getElementById("successName").textContent = name.split(" ")[0] || "amigo";
    document.getElementById("successCode").textContent = code;

    orderForm.hidden = true;
    document.getElementById("orderSuccess").hidden = false;

    document.getElementById("successToTrack").addEventListener(
      "click",
      () => {
        document.getElementById("trackInput").value = code;
      },
      { once: true }
    );
  });

  /* =================================================================
     Rastreo: busca el código en los pedidos simulados, o genera una
     línea de tiempo determinista a partir del texto ingresado.
     ================================================================= */
  const trackForm = document.getElementById("trackForm");
  trackForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const raw = document.getElementById("trackInput").value.trim();
    if (!raw) return;
    const code = raw.toUpperCase();

    const orders = readOrders();
    let progress, anchorDate;

    if (orders[code]) {
      anchorDate = new Date(orders[code].anchorDate);
      // Cuantos días han pasado desde la recolección definen el avance.
      const daysSince = Math.floor((Date.now() - anchorDate.getTime()) / 86400000);
      progress = Math.min(Math.max(daysSince, 0), STAGES.length - 1);
    } else {
      // Código no registrado: se genera una línea de tiempo de demostración,
      // estable para el mismo texto ingresado.
      const seed = hashCode(code);
      progress = seed % STAGES.length;
      anchorDate = new Date();
      anchorDate.setDate(anchorDate.getDate() - progress);
    }

    const entries = buildTimeline(progress, anchorDate);
    renderTimeline(code, entries);
    document.getElementById("trackResult").scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "nearest" });
  });
});
