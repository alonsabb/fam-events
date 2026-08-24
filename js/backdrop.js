// ============================================================================
// Ambient "pollen" backdrop: small fuzzy circles of varying size, drifting
// slowly and randomly across the screen — like dust motes in spring light.
// Purely decorative (aria-hidden host), generated once at load.
// ============================================================================

(function () {
  "use strict";

  const COLORS = ["#6fc0da", "#8fd3e8", "#5aa8c9", "#7ec8dd", "#4f9bbd"];
  const COUNT = 26;

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function buildParticle() {
    const el = document.createElement("div");
    el.className = "backdrop__particle";
    const size = rand(5, 26);
    el.style.left = `${rand(0, 100)}%`;
    el.style.top = `${rand(0, 100)}%`;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.background = COLORS[Math.floor(rand(0, COLORS.length))];
    el.style.filter = `blur(${rand(2, 5).toFixed(1)}px)`;
    el.style.animationDuration = `${rand(26, 55)}s`;
    el.style.animationDelay = `-${rand(0, 45)}s`;
    el.style.setProperty("--o", rand(0.16, 0.4).toFixed(2));
    // Four loosely-random waypoints per particle so each one wanders its own
    // meandering path instead of every particle following the same line.
    el.style.setProperty("--dx1", `${rand(-16, 16).toFixed(1)}vw`);
    el.style.setProperty("--dy1", `${rand(-12, 12).toFixed(1)}vh`);
    el.style.setProperty("--dx2", `${rand(-22, 22).toFixed(1)}vw`);
    el.style.setProperty("--dy2", `${rand(-18, 18).toFixed(1)}vh`);
    el.style.setProperty("--dx3", `${rand(-16, 16).toFixed(1)}vw`);
    el.style.setProperty("--dy3", `${rand(-14, 14).toFixed(1)}vh`);
    el.style.setProperty("--dx4", `${rand(-8, 8).toFixed(1)}vw`);
    el.style.setProperty("--dy4", `${rand(-8, 8).toFixed(1)}vh`);
    return el;
  }

  function mount() {
    const host = document.querySelector(".backdrop__particles");
    if (!host) return;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < COUNT; i++) frag.appendChild(buildParticle());
    host.appendChild(frag);
  }

  document.addEventListener("DOMContentLoaded", mount);
})();
