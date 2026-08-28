// ============================================================================
// Boots the page: discovers events by listing the direct subfolders of one
// hardcoded root folder in Drive (each event = one folder, its Drive name
// IS the event name — no config edit needed to add an event), shows a
// picker if there's more than one, then renders a sidebar of that event's
// own Drive subfolders + a content pane that shows the selected folder as a
// fullscreen-capable carousel.
// ============================================================================

(function () {
  "use strict";

  const config = window.PARTY_CONTENT;
  const app = document.getElementById("app");
  const folderCache = new Map(); // root.id -> flat items array, per page load

  function el(tag, className, html) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (html !== undefined) node.innerHTML = html;
    return node;
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

  async function loadFolder(root) {
    if (root.directItems) return root.directItems;
    if (folderCache.has(root.id)) return folderCache.get(root.id);

    const items = await window.DriveModule.buildFlatFolder(root, config.driveApiKey);
    folderCache.set(root.id, items);
    return items;
  }

  // Same "list direct subfolders" mechanism used at two levels: the root
  // folder's subfolders become events, and an event folder's subfolders
  // become its sidebar categories — both just discoverSidebarFolders on a
  // different folder ID.
  async function discoverFolders(folderId) {
    if (window.DriveModule.isConfigured(config) && !window.DriveModule.isPlaceholder(folderId)) {
      return { entries: await window.DriveModule.discoverSidebarFolders(folderId, config.driveApiKey), demo: false };
    }
    return { entries: window.DriveModule.getMockSidebarFolders(), demo: true };
  }

  function renderEventLayout(event, allEvents, demo) {
    app.innerHTML = "";
    const layout = el("div", "layout");

    const sidebar = el("aside", "sidebar");
    const header = el("div", "sidebar__header", `<h1>${event.label}</h1>`);
    sidebar.appendChild(header);

    if (allEvents.length > 1) {
      const back = el("a", "sidebar__back", "&rarr; כל האירועים");
      back.href = "#";
      back.addEventListener("click", (e) => {
        e.preventDefault();
        renderPicker(allEvents, demo);
      });
      sidebar.appendChild(back);
    }

    const nav = el("nav", "sidebar__nav", `<p class="sidebar__nav-status">טוען תיקיות…</p>`);
    let links = [];
    sidebar.appendChild(nav);

    const overlay = el("div", "sidebar-overlay");
    function closeDrawer() {
      sidebar.classList.remove("is-open");
      document.body.classList.remove("sidebar-open");
    }
    const toggle = el("button", "sidebar-toggle", "&#9776; תיקיות");
    toggle.addEventListener("click", () => {
      sidebar.classList.toggle("is-open");
      document.body.classList.toggle("sidebar-open");
    });
    overlay.addEventListener("click", closeDrawer);

    const contentPane = el(
      "div",
      "content-pane",
      `<div class="welcome"><h2>ברוכים הבאים</h2><p>בחרו תיקייה מהתפריט מימין כדי להתחיל לגלוש.</p></div>`
    );

    layout.appendChild(sidebar);
    layout.appendChild(contentPane);
    app.appendChild(toggle);
    app.appendChild(overlay);
    app.appendChild(layout);

    async function selectFolder(root, activeLink) {
      links.forEach((l) => l.classList.remove("is-active"));
      activeLink.classList.add("is-active");
      closeDrawer();
      window.CarouselModule.unmount();

      withTransition(() => {
        contentPane.innerHTML = `<p class="content-pane__status">טוען תיקייה…</p>`;
      });

      try {
        const items = await loadFolder(root);
        withTransition(() => {
          contentPane.innerHTML = "";
          if (!items.length) {
            contentPane.appendChild(el("p", "content-pane__status", "התיקייה הזו ריקה."));
            return;
          }
          if (!window.DriveModule.isConfigured(config)) {
            contentPane.appendChild(
              el(
                "p",
                "content-pane__status content-pane__status--demo",
                "מוצג תוכן לדוגמה — יש להגדיר בקובץ content/config.js מפתח Drive API אמיתי ותיקיית אם אמיתית כדי להחליף זאת."
              )
            );
          }
          window.CarouselModule.mount(contentPane, items, 0);
        });
      } catch (err) {
        withTransition(() => {
          contentPane.innerHTML = "";
          contentPane.appendChild(
            el(
              "p",
              "content-pane__status content-pane__status--error",
              `לא ניתן היה לטעון את התיקייה מגוגל דרייב (${err.message}). יש לבדוק את מפתח ה-API ואת הרשאות השיתוף של התיקייה.`
            )
          );
        });
      }
    }

    discoverFolders(event.id)
      .then(({ entries, demo: subDemo }) => {
        nav.innerHTML = "";
        links = [];
        if (!entries.length) {
          nav.appendChild(el("p", "sidebar__nav-status", "לא נמצאו תיקיות תחת תיקיית האירוע."));
          return;
        }
        entries.forEach((entry) => {
          const link = el("button", "sidebar__link", entry.label);
          link.addEventListener("click", () => selectFolder(entry, link));
          nav.appendChild(link);
          links.push(link);
        });
        if (subDemo) {
          nav.appendChild(
            el(
              "p",
              "sidebar__nav-status sidebar__nav-status--demo",
              "תוכן לדוגמה — הגדירו rootFolderId אמיתי ב-content/config.js."
            )
          );
        }
        if (links.length) links[0].click();
      })
      .catch((err) => {
        nav.innerHTML = "";
        nav.appendChild(
          el(
            "p",
            "sidebar__nav-status sidebar__nav-status--error",
            `שגיאה בטעינת רשימת התיקיות (${err.message}).`
          )
        );
      });
  }

  function renderPicker(entries, demo) {
    app.innerHTML = "";
    const wrap = el("div", "picker");
    wrap.appendChild(el("h1", "picker__title", "אירועים משפחתיים"));
    const grid = el("div", "picker__grid");
    entries.forEach((entry) => {
      const card = el("button", "picker__card", `<h2>${entry.label}</h2>`);
      card.addEventListener("click", () => renderEventLayout(entry, entries, demo));
      grid.appendChild(card);
    });
    wrap.appendChild(grid);
    app.appendChild(wrap);
  }

  async function boot() {
    if (!config) {
      app.textContent = "קובץ content/config.js חסר";
      return;
    }

    app.innerHTML = `<p class="content-pane__status" style="margin:4rem auto;">טוען אירועים…</p>`;

    try {
      const { entries, demo } = await discoverFolders(config.rootFolderId);
      if (!entries.length) {
        app.textContent = "לא נמצאו תיקיות אירוע תחת תיקיית האם.";
        return;
      }
      if (entries.length > 1) {
        renderPicker(entries, demo);
      } else {
        renderEventLayout(entries[0], entries, demo);
      }
    } catch (err) {
      app.textContent = `שגיאה בטעינת רשימת האירועים (${err.message}).`;
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
