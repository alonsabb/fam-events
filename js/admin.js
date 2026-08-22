// ============================================================================
// Admin panel: password gate (casual deterrent only, see README) + a form to
// publish a brand-new event section straight to GitHub via the Contents API.
// The GitHub token is the real credential here — stored only in this
// browser's localStorage, never written to the repo.
// ============================================================================

window.AdminModule = (function () {
  "use strict";

  const TOKEN_KEY = "momapp_admin_github_token";
  let config, panel;

  async function sha256Hex(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // UTF-8 safe base64 encode (plain btoa breaks on non-Latin1 characters).
  function toBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
  }

  function ensureDom() {
    if (panel) return;
    panel = document.createElement("div");
    panel.className = "admin-modal";
    panel.innerHTML = `
      <div class="admin-modal__box">
        <button class="admin-modal__close" aria-label="סגור">&times;</button>
        <div class="admin-modal__step" data-step="password">
          <h2>ניהול</h2>
          <p class="admin-modal__hint">זהו חסם בסיסי בלבד, לא אבטחה אמיתית.</p>
          <input type="password" class="admin-modal__password" placeholder="סיסמה" autocomplete="off" />
          <button class="admin-modal__submit" data-action="check-password">כניסה</button>
          <p class="admin-modal__error" hidden></p>
        </div>
        <div class="admin-modal__step" data-step="token" hidden>
          <h2>טוקן גישה ל-GitHub</h2>
          <p class="admin-modal__hint">
            טוקן גישה אישי (fine-grained) המוגבל לתוכן המאגר הזה בלבד
            (קריאה וכתיבה). נשמר רק בדפדפן הזה.
          </p>
          <input type="password" class="admin-modal__token" placeholder="github_pat_..." autocomplete="off" />
          <button class="admin-modal__submit" data-action="save-token">שמירת טוקן</button>
          <p class="admin-modal__error" hidden></p>
        </div>
        <div class="admin-modal__step" data-step="form" hidden>
          <h2>הוספת אירוע חדש</h2>
          <label>שם האירוע <input class="af-name" placeholder="יום הולדת 70 לאבא" /></label>
          <label>כותרת משנה <input class="af-subtitle" placeholder="חגיגת יום הולדת 70" /></label>
          <label>תאריך <input class="af-date" placeholder="יוני 2027" /></label>
          <label>
            מזהה תיקיית האם ב-Drive
            <input class="af-drive-folder-id" placeholder="מזהה התיקייה שמרכזת את כל תתי־התיקיות של האירוע" />
          </label>
          <p class="admin-modal__hint">
            כל תת-תיקייה בתוך התיקייה הזו תופיע אוטומטית כפריט נפרד בתפריט הצד.
          </p>
          <button class="admin-modal__submit" data-action="publish">פרסום האירוע</button>
          <p class="admin-modal__error" hidden></p>
          <p class="admin-modal__success" hidden></p>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    panel.querySelector(".admin-modal__close").addEventListener("click", closePanel);
    panel.addEventListener("click", (e) => {
      if (e.target === panel) closePanel();
    });
    panel
      .querySelector('[data-action="check-password"]')
      .addEventListener("click", checkPassword);
    panel
      .querySelector('[data-action="save-token"]')
      .addEventListener("click", saveToken);
    panel.querySelector('[data-action="publish"]').addEventListener("click", publish);
  }

  function showStep(name) {
    panel.querySelectorAll(".admin-modal__step").forEach((el) => {
      el.hidden = el.dataset.step !== name;
    });
  }

  function showError(step, message) {
    const el = panel.querySelector(`[data-step="${step}"] .admin-modal__error`);
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
  }

  async function checkPassword() {
    const input = panel.querySelector(".admin-modal__password").value;
    const hash = await sha256Hex(input);
    if (hash !== config.adminPasswordHash) {
      showError("password", "סיסמה שגויה.");
      return;
    }
    if (localStorage.getItem(TOKEN_KEY)) {
      showStep("form");
    } else {
      showStep("token");
    }
  }

  async function saveToken() {
    const token = panel.querySelector(".admin-modal__token").value.trim();
    if (!token) return;

    const btn = panel.querySelector('[data-action="save-token"]');
    const errorEl = panel.querySelector('[data-step="token"] .admin-modal__error');
    errorEl.hidden = true;
    btn.disabled = true;
    btn.textContent = "בודק טוקן…";

    localStorage.setItem(TOKEN_KEY, token);
    try {
      // A read-only check isn't enough — a token can have Contents:
      // Read-only and pass a GET while still failing at publish time.
      // Create-then-delete a throwaway file to actually prove write
      // access, so a wrongly-scoped token is caught here instead of
      // after filling out the whole event form.
      await verifyWriteAccess();
      showStep("form");
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = "שמירת טוקן";
    }
  }

  async function verifyWriteAccess() {
    const testPath = "content/.token-check";
    const created = await githubRequest(`/contents/${testPath}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Verify admin token write access",
        content: toBase64("ok"),
        branch: config.githubRepo.branch
      })
    });
    await githubRequest(`/contents/${testPath}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Clean up token check",
        sha: created.content.sha,
        branch: config.githubRepo.branch
      })
    });
  }

  async function githubRequest(path, options) {
    const token = localStorage.getItem(TOKEN_KEY);
    const res = await fetch(`https://api.github.com/repos/${config.githubRepo.owner}/${config.githubRepo.name}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        ...(options && options.headers)
      }
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem(TOKEN_KEY);
        throw new Error(
          "הטוקן שנשמר לא תקין או שאין לו הרשאות מספיקות. הוא נמחק — פתחו את הניהול שוב כדי להזין טוקן חדש."
        );
      }
      throw new Error(body.message || `GitHub API error (${res.status})`);
    }
    return res.json();
  }

  async function publish() {
    const errorEl = panel.querySelector('[data-step="form"] .admin-modal__error');
    const successEl = panel.querySelector('[data-step="form"] .admin-modal__success');
    errorEl.hidden = true;
    successEl.hidden = true;

    const name = panel.querySelector(".af-name").value.trim();
    const subtitle = panel.querySelector(".af-subtitle").value.trim();
    const date = panel.querySelector(".af-date").value.trim();
    const driveFolderId = panel.querySelector(".af-drive-folder-id").value.trim();

    if (!name || !driveFolderId) {
      errorEl.textContent = "יש להזין שם אירוע ומזהה תיקיית אם ב-Drive.";
      errorEl.hidden = false;
      return;
    }

    const newSection = {
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      hero: { name, subtitle, date, heroImageDriveId: null },
      driveFolderId
    };

    try {
      const current = await githubRequest("/contents/content/config.js", { method: "GET" });
      const updated = {
        ...config,
        sections: [...config.sections, newSection]
      };
      const newFileText =
        "// Auto-updated by the admin panel. Manual comments below this line may be lost on future edits.\n" +
        "window.PARTY_CONTENT = " +
        JSON.stringify(updated, null, 2) +
        ";\n";

      await githubRequest("/contents/content/config.js", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Add section: ${name}`,
          content: toBase64(newFileText),
          sha: current.sha,
          branch: config.githubRepo.branch
        })
      });

      config.sections.push(newSection);
      successEl.textContent = "פורסם! זה יופיע באתר החי תוך כדקה.";
      successEl.hidden = false;
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    }
  }

  function openPanel(cfg) {
    config = cfg;
    ensureDom();
    showStep("password");
    panel.classList.add("is-open");
  }

  function closePanel() {
    if (panel) panel.classList.remove("is-open");
  }

  function init(cfg) {
    config = cfg;
    const link = document.querySelector("[data-admin-link]");
    if (link) link.addEventListener("click", (e) => {
      e.preventDefault();
      openPanel(config);
    });
  }

  return { init };
})();
