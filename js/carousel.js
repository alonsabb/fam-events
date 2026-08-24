// ============================================================================
// Fullscreen-capable media carousel. Mounts inline into a content pane by
// default (sidebar stays visible); an expand button promotes it to a true
// fullscreen overlay. Supports keyboard arrows, swipe, and the native View
// Transitions API for smooth crossfades — no external library.
// ============================================================================

window.CarouselModule = (function () {
  "use strict";

  let container, frameWrap, caption, counter;
  let items = [];
  let index = 0;
  let mounted = false;

  function el(tag, className, html) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  function build() {
    container = el("div", "carousel");
    container.innerHTML = `
      <div class="carousel__stage">
        <button class="carousel__nav carousel__nav--prev" aria-label="הקודם">&#8250;</button>
        <div class="carousel__frame-wrap"></div>
        <button class="carousel__nav carousel__nav--next" aria-label="הבא">&#8249;</button>
        <button class="carousel__expand" aria-label="מסך מלא">&#10021;</button>
      </div>
      <div class="carousel__meta">
        <span class="carousel__caption"></span>
        <span class="carousel__counter"></span>
      </div>
    `;

    frameWrap = container.querySelector(".carousel__frame-wrap");
    caption = container.querySelector(".carousel__caption");
    counter = container.querySelector(".carousel__counter");

    container.querySelector(".carousel__nav--prev").addEventListener("click", () => show(index - 1));
    container.querySelector(".carousel__nav--next").addEventListener("click", () => show(index + 1));
    container.querySelector(".carousel__expand").addEventListener("click", toggleFullscreen);

    document.addEventListener("keydown", (e) => {
      if (!mounted) return;
      // RTL layout: next sits visually on the left, previous on the right.
      if (e.key === "ArrowLeft") show(index + 1);
      if (e.key === "ArrowRight") show(index - 1);
      if (e.key === "Escape" && container.classList.contains("is-fullscreen")) toggleFullscreen();
    });

    const stage = container.querySelector(".carousel__stage");
    let startX = null;
    stage.addEventListener("pointerdown", (e) => {
      startX = e.clientX;
    });
    stage.addEventListener("pointerup", (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 50) show(dx < 0 ? index + 1 : index - 1);
      startX = null;
    });
  }

  function withTransition(fn) {
    if (document.startViewTransition) {
      const t = document.startViewTransition(fn);
      t.finished.catch(() => {});
      t.ready.catch(() => {});
    } else {
      fn();
    }
  }

  // Stage is cleared and rebuilt from scratch on every render — exactly the
  // pattern proven to work in gallery.html — rather than reusing/toggling a
  // fixed set of sibling elements (img/iframe/fallback/demo stacked with
  // position:absolute + z-index), which silently failed to display images
  // even after switching to fresh <img> elements alone.
  function renderCurrent() {
    const item = items[index];
    const isDemo = item.kind === "image-demo" || item.kind === "video-demo";
    frameWrap.innerHTML = "";

    if (isDemo) {
      const demo = el("div", "carousel__demo");
      demo.style.background = item.color || "var(--viewer-bg-soft)";
      demo.appendChild(el("span", "carousel__demo-label", item.kind === "image-demo" ? "תמונת דוגמה" : "סרטון דוגמה"));
      frameWrap.appendChild(demo);
    } else if (item.imageUrl) {
      const image = document.createElement("img");
      image.className = "carousel__image";
      image.alt = "";
      image.onerror = () => {
        frameWrap.innerHTML = "";
        frameWrap.appendChild(buildFallback(item));
      };
      image.src = item.imageUrl;
      frameWrap.appendChild(image);
    } else if (item.embedUrl) {
      const frame = document.createElement("iframe");
      frame.className = "carousel__frame";
      frame.allowFullscreen = true;
      frame.allow = "autoplay; encrypted-media; fullscreen";
      frame.src = item.embedUrl;
      frameWrap.appendChild(frame);
    } else {
      frameWrap.appendChild(buildFallback(item));
    }
    caption.textContent = item.name || "";
    counter.textContent = `${index + 1} מתוך ${items.length}`;
  }

  function buildFallback(item) {
    const fallback = el("div", "carousel__fallback");
    const link = el("a", "carousel__fallback-link", "פתח בדרייב");
    link.target = "_blank";
    link.rel = "noopener";
    link.href = item.driveUrl || "#";
    fallback.appendChild(link);
    return fallback;
  }

  // Navigation (prev/next/keyboard/swipe) — wrapped in its own transition
  // for a crossfade. NOT used for the initial mount, since that already
  // happens inside app.js's own transition; nesting document.startView
  // Transition() calls aborts the inner one and can leave a stale,
  // blank captured frame stuck on top of the real (already-updated) DOM.
  function show(i) {
    if (!items.length) return;
    index = (i + items.length) % items.length;
    withTransition(renderCurrent);
  }

  function toggleFullscreen() {
    const isFull = container.classList.toggle("is-fullscreen");
    document.body.classList.toggle("carousel-fullscreen", isFull);
  }

  function mount(mountEl, itemList, startIndex) {
    if (!container) build();
    mountEl.appendChild(container);
    items = itemList;
    mounted = true;
    index = ((startIndex || 0) + items.length) % items.length;
    renderCurrent();
  }

  function unmount() {
    mounted = false;
    if (container) {
      container.classList.remove("is-fullscreen");
      document.body.classList.remove("carousel-fullscreen");
      if (container.parentNode) container.parentNode.removeChild(container);
    }
  }

  return { mount, unmount };
})();
