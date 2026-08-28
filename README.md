# Family Celebration Site

A free, static gallery site for family events. Media lives on Google Drive;
this site is just HTML/CSS/JS hosted on GitHub Pages that embeds it. No
database, no server, no build step — `git push` is the entire deploy.

## How it works

- `content/config.js` points at **one hardcoded root folder** in Google
  Drive — that's the only ID you ever have to copy by hand, ever.
- Every **direct subfolder** of that root folder becomes an **event**
  automatically, using the subfolder's own Drive name as the event name. No
  config edit, no republish — create a folder in Drive and it's a new event.
- Inside each event folder, the exact same mechanism applies one level down:
  every **subfolder** becomes a link in the right-hand sidebar, using its own
  Drive name as the label. Loose files placed straight in a folder (event
  root or category) without their own subfolder get grouped into an
  automatic "כללי" (General) entry so nothing's lost.
- Clicking a sidebar entry fetches that folder's contents and opens them as a
  fullscreen-capable carousel — swipe or use the arrow keys to move through
  photos, videos, and slides one at a time, mixed together in whatever order
  they appear in Drive. Anything else falls back to a plain "open in Drive"
  link. Keep each category folder itself flat (no further nesting) for the
  cleanest browsing experience — a stray nested folder still works, its
  contents just get folded into the same carousel.
- Want to include a folder someone else shared with you (e.g. Aunt Rachel's
  photos) without duplicating anything? In Drive, right-click that shared
  folder → **"Add shortcut to Drive"** → place the shortcut wherever it
  should appear. It's picked up exactly like a real folder. (The original
  folder still needs its own "Anyone with the link" sharing set by whoever
  owns it — a shortcut doesn't grant access, just a pointer.)
- Add new **photos/videos to an existing category**: just add them in Google
  Drive. No repo edits needed — they show up automatically next page load.
- Add a **whole new category** for an event: just create a new subfolder
  inside that event's folder in Drive. It appears in the sidebar
  automatically — still no repo edits needed.
- Add a **brand-new event**: create a new folder directly inside the root
  folder in Drive, and share it the same way (see setup below). It appears
  as a new event on the site automatically — no repo edits needed.

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

### 2. Create and share your root folder

1. In Google Drive, create one folder to be the permanent root of the whole
   site (e.g. "Family Events"). Inside it, create one folder per event (e.g.
   "Mom's 80th"), and inside each event folder, create subfolders for however
   you want to organize that event (e.g. "Ceremony", "Videos", "Speeches") —
   each folder name becomes its label in the app automatically.
2. Right-click the **root folder** → **Share** → **General access** →
   **Anyone with the link** → **Viewer**. This one action covers everything
   inside it, present and future — every event and category you add later
   inherits the same sharing automatically, no per-folder re-sharing needed.
3. Copy the root folder's ID from its URL:
   `https://drive.google.com/drive/folders/`**`THIS_PART`**
4. Paste it into `content/config.js` as `rootFolderId`.

Exception: if you add a **shortcut** to someone else's shared folder (see
above), that original folder needs its own sharing set independently — a
shortcut doesn't inherit or grant permissions, it just points at the real
folder.

### 3. Create the GitHub repo and enable Pages

1. Create a new **public** GitHub repository (Pages on free accounts
   requires a public repo).
2. Push this folder to its `main` branch.
3. In the repo, go to **Settings → Pages** → Source: **Deploy from a
   branch** → Branch: **main**, folder **/ (root)**.
4. Your site will be live at `https://YOUR_USERNAME.github.io/YOUR_REPO/`
   within a minute or two.

## Ongoing maintenance

- **New photos/videos for an existing category**: just add them to that
  subfolder in Drive. Nothing to push.
- **A whole new category within an event**: create a new subfolder inside
  that event's folder in Drive. Nothing to push.
- **A whole new event**: create a new folder directly inside the root
  folder in Drive. Nothing to push.
- **Deploying a code/style change**: every `<script>`/`<link>` tag in
  `index.html` carries a `?v=N` cache-busting query string tied to the
  visible `#build-tag` number in the corner of the page — bump both together
  on every push that changes any file the browser would otherwise cache, or
  the change can silently fail to reach visitors' browsers.

## Local testing

Just open `index.html` in a browser — no server or build step required. With
placeholder values still in `content/config.js`, the site shows demo content
so you can see the picker, sidebar, carousel, and animations working before
doing any real setup.
