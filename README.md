# Family Celebration Site

A free, static gallery site for family events. Media lives on Google Drive;
this site is just HTML/CSS/JS hosted on GitHub Pages that embeds it. No
database, no server, no build step — `git push` is the entire deploy.

## How it works

- `content/config.js` lists one or more **events** (today: just the 80th
  birthday). Each event points at **one "mother" folder ID** in Google Drive
  — that's the only ID you ever have to copy by hand.
- On page load, the site asks Drive what's directly inside that mother
  folder. Every **subfolder** it finds becomes a link in the right-hand
  sidebar automatically, using the subfolder's own Drive name as the label —
  no manual folder-ID entry per category. Loose files placed straight in the
  mother folder (not inside any subfolder) get grouped into an automatic
  "כללי" (General) entry so nothing's lost.
- Clicking a sidebar entry fetches that folder's contents and opens them as a
  fullscreen-capable carousel — swipe or use the arrow keys to move through
  photos, videos, and slides one at a time, mixed together in whatever order
  they appear in Drive. Anything else falls back to a plain "open in Drive"
  link. Keep each subfolder itself flat (no further nesting) for the
  cleanest browsing experience — a stray nested folder still works, its
  contents just get folded into the same carousel.
- Want to include a folder someone else shared with you (e.g. Aunt Rachel's
  photos) without duplicating anything? In Drive, right-click that shared
  folder → **"Add shortcut to Drive"** → place the shortcut inside your
  mother folder. It's picked up exactly like a real subfolder. (The
  original folder still needs its own "Anyone with the link" sharing set by
  whoever owns it — a shortcut doesn't grant access, just a pointer.)
- Add new **photos/videos to an existing subfolder**: just add them in
  Google Drive. No repo edits needed — they show up automatically next page
  load.
- Add a **whole new category** for an event: just create a new subfolder
  inside the mother folder in Drive. It appears in the sidebar automatically
  — still no repo edits needed.
- Add a **brand-new event** (e.g. next year's celebration): either edit
  `content/config.js` by hand and push, or use the in-app **Admin** panel
  (footer link) once it's set up — see below.

## One-time setup

### 1. Google Drive API key

1. Go to [Google Cloud Console](https://console.cloud.google.com/), create a
   project (free), and enable the **Google Drive API**.
2. Create an **API key** (APIs & Services → Credentials → Create Credentials
   → API key).
3. **Restrict it** (important — this key will be public in your site's code):
   - Application restriction: **HTTP referrers**, add
     `https://YOUR_GITHUB_USERNAME.github.io/*`
   - API restriction: limit to **Google Drive API** only.
4. Paste the key into `content/config.js` as `driveApiKey`.

### 2. Create and share your mother folder

1. In Google Drive, create one folder to hold everything for the event (e.g.
   "Mom's 80th"), then create subfolders inside it for however you want to
   organize things (e.g. "Ceremony", "Videos", "Speeches") — each subfolder
   name becomes its sidebar label automatically.
2. Right-click the **mother folder** → **Share** → **General access** →
   **Anyone with the link** → **Viewer**. This one action covers everything
   inside it, present and future — you don't need to re-share each
   subfolder individually, since Drive permissions are inherited from
   parent folders.
3. Copy the mother folder's ID from its URL:
   `https://drive.google.com/drive/folders/`**`THIS_PART`**
4. Paste it into `content/config.js` as `driveFolderId` for the event.

Exception: if you add a **shortcut** to someone else's shared folder (see
above), that original folder needs its own sharing set independently — a
shortcut doesn't inherit or grant permissions, it just points at the real
folder.

### 3. Fill in the rest of `content/config.js`

- `hero.name`, `hero.subtitle`, `hero.date` for the event.
- Optionally `hero.heroImageDriveId` — a Drive file ID for a background photo.

### 4. Create the GitHub repo and enable Pages

1. Create a new **public** GitHub repository (Pages on free accounts
   requires a public repo).
2. Push this folder to its `main` branch.
3. In the repo, go to **Settings → Pages** → Source: **Deploy from a
   branch** → Branch: **main**, folder **/ (root)**.
4. Your site will be live at `https://YOUR_USERNAME.github.io/YOUR_REPO/`
   within a minute or two.

Fill in `githubRepo.owner` and `githubRepo.name` in `content/config.js` to
match — the admin panel needs this to know where to publish to.

### 5. Set up the admin panel (optional, only needed to add future events)

1. **Choose a password** and generate its hash — open any page's browser
   console (F12) and run:
   ```js
   crypto.subtle.digest("SHA-256", new TextEncoder().encode("your password here"))
     .then(buf => console.log([...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("")))
   ```
   Copy the printed hex string into `content/config.js` as `adminPasswordHash`.

   **Note:** this password is a casual deterrent only, not real security — it
   runs in public client-side code, so a determined visitor could bypass it
   entirely via browser dev tools. Don't rely on it to keep out anyone
   motivated; it just keeps the "Admin" link from being an obvious invitation.

2. **Create a GitHub personal access token** (Settings → Developer settings →
   Personal access tokens → Fine-grained tokens): scope it to **this one
   repository only**, with **Contents: Read and write** permission and
   nothing else. This token is the real credential — anyone who obtains it
   could push to this repo, so treat it like a password and don't share it.
3. The first time you open the Admin panel on the live site and enter your
   password, it'll ask for this token once and remember it in that browser
   only (not synced anywhere).
4. From then on, adding a new event (name, date, and its mother folder ID)
   via the Admin panel commits directly to `content/config.js` on GitHub.
   GitHub Pages rebuilds automatically within about a minute, and the new
   event becomes visible to everyone.

## Ongoing maintenance

- **New photos/videos for an existing category**: just add them to that
  subfolder in Drive. Nothing to push.
- **A whole new category within an event**: create a new subfolder inside
  that event's mother folder in Drive. Nothing to push.
- **A whole new event**: use the Admin panel (recommended), or hand-edit
  `content/config.js`'s `sections` array and push.
- **Editing/removing an event**: not built into the Admin panel (kept simple
  on purpose) — edit `content/config.js` directly and push.

## Local testing

Just open `index.html` in a browser — no server or build step required. With
placeholder values still in `content/config.js`, the site shows demo content
so you can see the sidebar, carousel, and animations working before doing any
real setup.
