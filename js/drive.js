// ============================================================================
// Google Drive API integration.
// The app points at ONE "mother" folder per event. Its direct subfolders
// become the sidebar entries automatically (no manual folder-ID entry) —
// subfolder names ARE the labels. Drive shortcuts inside the mother folder
// (e.g. a shortcut to a folder someone else shared with you) are resolved
// to their real target, so folders from anywhere in Drive can be included
// without duplicating content. Falls back to small demo content when the
// config still has placeholder values.
// ============================================================================

window.DriveModule = (function () {
  "use strict";

  const FOLDER_MIME = "application/vnd.google-apps.folder";
  const SHORTCUT_MIME = "application/vnd.google-apps.shortcut";
  const SLIDES_MIME = "application/vnd.google-apps.presentation";
  const PPTX_MIME =
    "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  const MAX_DEPTH = 6;
  const GENERAL_LABEL = "כללי";

  function isPlaceholder(value) {
    return !value || /^REPLACE_ME/.test(value);
  }

  function isConfigured(config) {
    return (
      !isPlaceholder(config.driveApiKey) &&
      Array.isArray(config.sections) &&
      config.sections.some((s) => !isPlaceholder(s.driveFolderId))
    );
  }

  // A shortcut's own id/name are its own, but it should behave exactly like
  // its target (folder or file) everywhere downstream.
  function resolveShortcut(file) {
    if (file.mimeType !== SHORTCUT_MIME || !file.shortcutDetails) return file;
    return {
      id: file.shortcutDetails.targetId,
      name: file.name,
      mimeType: file.shortcutDetails.targetMimeType || FOLDER_MIME
    };
  }

  // Classifies a Drive file into a renderable leaf item.
  function classifyFile(file, apiKey) {
    const base = { id: file.id, name: file.name, mimeType: file.mimeType };

    if (file.mimeType.startsWith("image/")) {
      // Drive's /preview iframe blocks framing for image files specifically
      // (confirmed: video/slides previews work fine, images don't) — load
      // as a plain <img> instead, which isn't subject to frame-ancestors at
      // all since it's a resource load, not a document embed.
      return {
        ...base,
        kind: "image",
        imageUrl: `https://drive.google.com/thumbnail?id=${file.id}&sz=w2000`,
        driveUrl: `https://drive.google.com/file/d/${file.id}/view`
      };
    }
    if (file.mimeType.startsWith("video/")) {
      // Same reasoning as images: Drive's /preview iframe intermittently
      // tries to nest an accounts.google.com sign-in frame internally,
      // which can never work embedded in a third-party site (frame-ancestors
      // checks the whole ancestor chain) — no reliable way to detect that
      // failure and fall back. A poster thumbnail + tap-to-watch-on-Drive
      // is slower (leaves the page) but works every time.
      return {
        ...base,
        kind: "video",
        imageUrl: `https://drive.google.com/thumbnail?id=${file.id}&sz=w2000`,
        // Streams file bytes directly via the Drive API's alt=media endpoint
        // rather than embedding Drive's /preview iframe (see comment above)
        // — a resource load isn't subject to frame-ancestors at all. Carousel
        // falls back to the poster + tap-to-watch-on-Drive if this fails.
        videoMediaUrl: `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${apiKey}`,
        driveUrl: `https://drive.google.com/file/d/${file.id}/view`
      };
    }
    if (file.mimeType === SLIDES_MIME) {
      return {
        ...base,
        kind: "slides",
        embedUrl: `https://docs.google.com/presentation/d/${file.id}/embed?start=false&loop=false&delayms=3000`,
        driveUrl: `https://docs.google.com/presentation/d/${file.id}/view`
      };
    }
    if (file.mimeType === PPTX_MIME) {
      return {
        ...base,
        kind: "pptx",
        embedUrl: `https://drive.google.com/file/d/${file.id}/preview`,
        driveUrl: `https://drive.google.com/file/d/${file.id}/view`
      };
    }
    return {
      ...base,
      kind: "other",
      driveUrl: `https://drive.google.com/file/d/${file.id}/view`
    };
  }

  async function listChildren(folderId, apiKey) {
    const url = new URL("https://www.googleapis.com/drive/v3/files");
    url.searchParams.set("q", `'${folderId}' in parents and trashed = false`);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("fields", "files(id,name,mimeType,shortcutDetails)");
    url.searchParams.set("pageSize", "1000");

    const res = await fetch(url.toString());
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const reason = body?.error?.message || res.statusText;
      throw new Error(`Drive API error for folder ${folderId}: ${reason}`);
    }
    const data = await res.json();
    return (data.files || []).map(resolveShortcut);
  }

  // Recursively builds a group node: { label, items: [leaf...], groups: [group...] }
  async function buildGroup(folderId, label, apiKey, depth) {
    const group = { label, items: [], groups: [] };
    if (depth > MAX_DEPTH) return group;

    const children = await listChildren(folderId, apiKey);
    for (const child of children) {
      if (child.mimeType === FOLDER_MIME) {
        const subgroup = await buildGroup(child.id, child.name, apiKey, depth + 1);
        group.groups.push(subgroup);
      } else {
        group.items.push(classifyFile(child, apiKey));
      }
    }
    return group;
  }

  // Flattens a group (and any nested subfolders within it) into one ordered
  // list of leaf items — folders are expected to be flat in practice, but
  // this tolerates stray subfolders gracefully instead of hiding them.
  function flattenGroup(group) {
    let items = [...group.items];
    group.groups.forEach((sub) => {
      items = items.concat(flattenGroup(sub));
    });
    return items;
  }

  async function buildFlatFolder(root, apiKey) {
    const group = await buildGroup(root.id, root.label, apiKey, 0);
    return flattenGroup(group);
  }

  // Lists the mother folder's direct children and turns each subfolder into
  // a sidebar entry (id + label, lazily loaded on click). Any loose files
  // sitting directly in the mother folder (not inside a subfolder) are
  // grouped into one "General" entry so nothing silently disappears.
  async function discoverSidebarFolders(motherFolderId, apiKey) {
    const children = await listChildren(motherFolderId, apiKey);
    const subfolders = children.filter((c) => c.mimeType === FOLDER_MIME);
    const looseFiles = children.filter((c) => c.mimeType !== FOLDER_MIME).map((f) => classifyFile(f, apiKey));

    const entries = subfolders.map((f) => ({ id: f.id, label: f.name }));
    if (looseFiles.length) {
      entries.unshift({
        id: `${motherFolderId}::general`,
        label: GENERAL_LABEL,
        directItems: looseFiles
      });
    }
    return entries;
  }

  function getMockTree() {
    return [
      {
        label: "תמונות (תוכן לדוגמה)",
        items: [
          { kind: "image-demo", name: "תמונת דוגמה 1", color: "#ff6f4d" },
          { kind: "image-demo", name: "תמונת דוגמה 2", color: "#ffb648" },
          { kind: "image-demo", name: "תמונת דוגמה 3", color: "#ff6f91" }
        ],
        groups: [
          {
            label: "טקס",
            items: [{ kind: "image-demo", name: "תמונת דוגמה 4", color: "#ffb648" }],
            groups: []
          }
        ]
      },
      {
        label: "סרטונים (תוכן לדוגמה)",
        items: [{ kind: "video-demo", name: "סרטון דוגמה" }],
        groups: []
      }
    ];
  }

  // Demo-mode sidebar entries, pre-flattened so no API call is ever made.
  function getMockSidebarFolders() {
    return getMockTree().map((group, i) => ({
      id: `demo-${i}`,
      label: group.label,
      directItems: flattenGroup(group)
    }));
  }

  return {
    isConfigured,
    isPlaceholder,
    discoverSidebarFolders,
    buildFlatFolder,
    getMockSidebarFolders
  };
})();
