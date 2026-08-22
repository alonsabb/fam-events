// ============================================================================
// Site configuration — the only file you need to hand-edit for routine setup.
// Adding new PHOTOS/VIDEOS to an existing event needs NO edits here at all —
// just add them in Google Drive and they show up automatically.
// This file only changes when: first-time setup, or adding a brand-new event
// section by hand (the admin panel in the app does this for you automatically
// after first-time setup is done).
// ============================================================================

window.PARTY_CONTENT = {
  // Where this site's own repo lives on GitHub. The admin panel needs this to
  // know where to publish new sections to. See README.md for setup.
  githubRepo: {
    owner: "alonsabb",
    name: "fam-events",
    branch: "main"
  },

  // A Google Drive API key, restricted (in Google Cloud Console) to the Drive
  // API only + your *.github.io site as an allowed HTTP referrer. Safe to be
  // public in this file under that restriction. See README.md for setup.
  driveApiKey: "AIzaSyB99QA2pwsQ2hNi8gV7zD6UqMOWML9T5Zg",

  // SHA-256 hex hash of your admin password (NOT the plaintext password).
  // This is a casual deterrent only, not real security — see README.md.
  // Generate it via the snippet in README.md.
  adminPasswordHash: "REPLACE_ME_PASSWORD_HASH",

  // One entry per family event/celebration. Today there's just one; the admin
  // panel appends more here later, publishing straight to GitHub.
  sections: [
    {
      id: "mom-80th",
      hero: {
        name: "ליאורה",
        subtitle: "חגיגת יום הולדת 80",
        date: "14.8.26",
        // Optional: a Drive file ID (image) to use as the hero background.
        // Leave null to use the default decorative gradient background.
        heroImageDriveId: null
      },
      // The ID of ONE "mother" folder in Drive for this event. Every
      // subfolder directly inside it becomes a sidebar entry automatically —
      // the subfolder's own Drive name is its label, no manual copying of
      // folder IDs needed. To include a folder someone else shared with you
      // (e.g. Aunt Rachel's photos), right-click it in Drive > "Add shortcut
      // to Drive" and place the shortcut inside this mother folder — it'll
      // be picked up like any other subfolder. Loose files placed directly
      // in the mother folder (not inside a subfolder) are grouped into an
      // automatic "כללי" (General) entry.
      driveFolderId: "1zA-2jfoI7GleHwM9zssACMwzGFNAK-ZA"
    }
  ]
};
