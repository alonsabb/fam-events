// ============================================================================
// Fullscreen-capable media carousel. Mounts inline into a content pane by
// default (sidebar stays visible); an expand button promotes it to a true
// fullscreen overlay. Supports keyboard arrows, swipe, and the native View
// Transitions API for smooth crossfades — no external library.
// ============================================================================

window.CarouselModule = (function () {
  "use strict";

  let container, frame, fallback, fallbackLink, demo, demoLabel, caption, counter;
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
        <div class="carousel__frame-wrap">
          <iframe class="carousel__frame" loading="lazy" allowfullscreen allow="autoplay; encrypted-media; fullscreen"></iframe>
          <div class="carousel__fallback" hidden>
            <a class="carousel__fallback-link" target="_blank" rel="noopener">פתח בדרייב</a>
          </div>
          <div class="carousel__demo" hidden>
            <span class="carousel__demo-label"></span>
          </div>
        </div>
        <button class="carousel__nav carousel__nav--next" aria-label="הבא">&#8249;</button>
        <button class="carousel__expand" aria-label="מסך מלא">&#10021;</button>
      </div>
      <div class="carousel__meta">
        <span class="carousel__caption"></span>
        <span class="carousel__counter"></span>
      </div>
    `;

    frame = container.querySelector(".carousel__frame");
    fallback = container.querySelector(".carousel__fallback");
    fallbackLink = container.querySelector(".carousel__fallback-link");
    demo = container.querySelector(".carousel__demo");
    demoLabel = container.querySelector(".carousel__demo-label");
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

  function show(i) {
    if (!items.length) return;
    index = (i + items.length) % items.length;
    const item = items[index];
    withTransition(() => {
      const isDemo = item.kind === "image-demo" || item.kind === "video-demo";
      frame.hidden = true;
      fallback.hidden = true;
      demo.hidden = true;
      frame.src = "about:blank";

      if (isDemo) {
        demo.hidden = false;
        demo.style.background = item.color || "var(--viewer-bg-soft)";
        demoLabel.textContent = item.kind === "image-demo" ? "תמונת דוגמה" : "סרטון דוגמה";
      } else if (item.embedUrl) {
        frame.hidden = false;
        frame.src = item.embedUrl;
      } else {
        fallback.hidden = false;
        fallbackLink.href = item.driveUrl || "#";
      }
      caption.textContent = item.name || "";
      counter.textContent = `${index + 1} מתוך ${items.length}`;
    });
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
    show(startIndex || 0);
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
