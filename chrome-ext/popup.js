const toast = document.getElementById("status-toast");
const toastText = document.getElementById("toast-text");
const projectList = document.getElementById("project-list");
const emptyState = document.getElementById("empty-state");
const mainView = document.getElementById("main-view");
const formView = document.getElementById("form-view");

const addBtn = document.getElementById("add-project-btn");
const cancelBtn = document.getElementById("cancel-btn");
const saveBtn = document.getElementById("save-btn");

const librarySelect = document.getElementById("p-library");
const collectionSelect = document.getElementById("p-collection");
const zoteroStatus = document.getElementById("zotero-status");

const autoSyncPageVisit = document.getElementById("auto-sync-page-visit");
const autoSyncIntervalEnabled = document.getElementById(
  "auto-sync-interval-enabled",
);
const autoSyncInterval = document.getElementById("auto-sync-interval");

let projects = [];

const ZOTERO_HOST = "http://localhost:23119";

const icons = {
  plus: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`,
  pencil: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`,
  trash: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
  folder: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
  tag: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`,
  info: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
  library: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`,
};

// Set the header icon
document.getElementById("add-project-btn").innerHTML = icons.plus;
document.querySelector("#status-toast i").outerHTML = icons.info;

// --- Zotero Fetch Helper ---

async function fetchFromZotero(endpoint, body = {}) {
  const res = await fetch(`${ZOTERO_HOST}${endpoint}`, {
    method: "POST",
    headers: {
      "Zotero-Allowed-Request": "true",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Zotero ${res.status}`);
  return res.json();
}

// --- Dropdown Population ---

async function loadLibraries() {
  librarySelect.disabled = true;
  librarySelect.innerHTML = '<option value="">Loading...</option>';
  zoteroStatus.classList.add("hidden");

  try {
    const libraries = await fetchFromZotero("/notebooklm/libraries");
    librarySelect.innerHTML = "";
    for (const lib of libraries) {
      const opt = document.createElement("option");
      opt.value = lib.libraryID;
      opt.textContent =
        lib.name + (lib.libraryType === "group" ? " (Group)" : "");
      opt.dataset.name = lib.name;
      librarySelect.appendChild(opt);
    }
    librarySelect.disabled = false;

    // Auto-select if only one library
    if (libraries.length === 1) {
      librarySelect.value = libraries[0].libraryID;
    }

    return true;
  } catch (e) {
    librarySelect.innerHTML =
      '<option value="">Cannot connect to Zotero</option>';
    zoteroStatus.classList.remove("hidden");
    return false;
  }
}

async function loadCollections(libraryID) {
  collectionSelect.disabled = true;
  collectionSelect.innerHTML = '<option value="">Loading...</option>';

  try {
    const collections = await fetchFromZotero("/notebooklm/collections", {
      libraryID,
    });

    collectionSelect.innerHTML = "";
    // "Entire Library" as first option
    const emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = "Entire Library";
    emptyOpt.dataset.name = "";
    collectionSelect.appendChild(emptyOpt);

    // Build tree with indentation
    const byParent = {};
    for (const col of collections) {
      const pid = col.parentID || 0;
      if (!byParent[pid]) byParent[pid] = [];
      byParent[pid].push(col);
    }

    function addChildren(parentID, depth) {
      const children = byParent[parentID] || [];
      for (const col of children) {
        const opt = document.createElement("option");
        opt.value = col.id;
        opt.textContent = "\u00A0\u00A0".repeat(depth) + col.name;
        opt.dataset.name = col.name;
        collectionSelect.appendChild(opt);
        addChildren(col.id, depth + 1);
      }
    }
    addChildren(0, 0);
    // Also add root-level collections (parentID === null mapped to 0)
    // Already handled since null -> 0 mapping above

    collectionSelect.disabled = false;
  } catch (e) {
    collectionSelect.innerHTML =
      '<option value="">Failed to load collections</option>';
  }
}

// Wire library change -> reload collections
librarySelect.addEventListener("change", () => {
  if (librarySelect.value) {
    loadCollections(librarySelect.value);
  } else {
    collectionSelect.disabled = true;
    collectionSelect.innerHTML =
      '<option value="">Select a library first</option>';
  }
});

// --- Initialize ---

async function load() {
  const data = await chrome.storage.local.get("projects");
  projects = data.projects || [];
  render();
  loadAutoSyncSettings();
}

function showToast(text, duration = 3000) {
  toastText.textContent = text;
  toast.classList.add("show");
  if (duration > 0) {
    setTimeout(() => toast.classList.remove("show"), duration);
  }
}

// --- Render Project Cards ---

function render() {
  projectList.innerHTML = "";
  if (projects.length === 0) {
    emptyState.classList.remove("hidden");
  } else {
    emptyState.classList.add("hidden");
    projects.forEach((p, i) => {
      const card = document.createElement("div");
      card.className = "project-card";

      let metaHtml = "";
      const collDisplay = p.collectionName || p.collection;
      if (collDisplay) {
        metaHtml += `
                    <div class="meta-item">
                        ${icons.folder}
                        <span>${collDisplay}</span>
                    </div>
                `;
      }
      if (p.tag) {
        metaHtml += `
                    <div class="meta-item">
                        ${icons.tag}
                        <span>${p.tag}</span>
                    </div>
                `;
      }
      const libDisplay = p.libraryName;
      if (libDisplay) {
        metaHtml += `
                    <div class="meta-item">
                        ${icons.library}
                        <span>${libDisplay}</span>
                    </div>
                `;
      }

      card.innerHTML = `
                <div class="project-title">${p.name}</div>
                <div class="project-meta">${metaHtml || "No filters active"}</div>
                <div class="actions">
                    <button class="btn-sync" data-index="${i}">
                        ${icons.refresh}
                        Sync
                    </button>
                    <button class="btn-icon edit-btn" data-index="${i}" title="Edit">
                        ${icons.pencil}
                    </button>
                    <button class="btn-icon delete-btn delete" data-index="${i}" title="Delete">
                        ${icons.trash}
                    </button>
                </div>
            `;
      projectList.appendChild(card);
    });
  }

  // Bindings
  document.querySelectorAll(".btn-sync").forEach((b) =>
    b.addEventListener("click", (e) => {
      const btn = e.currentTarget;
      const icon = btn.querySelector("svg");
      if (icon) icon.style.animation = "spin 1s linear infinite";

      startSync(projects[btn.dataset.index]);
    }),
  );

  document.querySelectorAll(".edit-btn").forEach((b) =>
    b.addEventListener("click", (e) => {
      showForm(
        projects[e.currentTarget.dataset.index],
        e.currentTarget.dataset.index,
      );
    }),
  );

  document.querySelectorAll(".delete-btn").forEach((b) =>
    b.addEventListener("click", (e) => {
      const idx = e.currentTarget.dataset.index;
      if (confirm(`Delete project "${projects[idx].name}"?`)) {
        projects.splice(idx, 1);
        save();
      }
    }),
  );
}

// Add CSS for rotation animation dynamically
const style = document.createElement("style");
style.textContent = `
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
`;
document.head.append(style);

// --- Form ---

async function showForm(p = null, idx = -1) {
  document.getElementById("p-name").value = p ? p.name : "";
  document.getElementById("p-tag").value = p ? p.tag || "" : "";
  document.getElementById("edit-id").value = idx;
  document.getElementById("form-title-text").textContent = p
    ? "Edit Project"
    : "New Project";

  // Reset dropdowns
  collectionSelect.disabled = true;
  collectionSelect.innerHTML =
    '<option value="">Select a library first</option>';

  mainView.classList.add("hidden");
  formView.classList.remove("hidden");

  // Load libraries from Zotero
  const loaded = await loadLibraries();

  if (loaded && p) {
    // Pre-select library
    const libVal = p.libraryID || "";
    if (libVal && librarySelect.querySelector(`option[value="${libVal}"]`)) {
      librarySelect.value = libVal;
    }
    // Load collections for this library, then pre-select
    await loadCollections(librarySelect.value);
    const colVal = p.collectionID || "";
    if (colVal && collectionSelect.querySelector(`option[value="${colVal}"]`)) {
      collectionSelect.value = colVal;
    }
  } else if (loaded) {
    // New project: auto-load collections for the default-selected library
    await loadCollections(librarySelect.value);
  }
}

function hideForm() {
  mainView.classList.remove("hidden");
  formView.classList.add("hidden");
}

async function save() {
  await chrome.storage.local.set({ projects });
  render();
}

saveBtn.addEventListener("click", async () => {
  const name = document.getElementById("p-name").value.trim();
  if (!name) return alert("Please enter a project name.");

  const idx = parseInt(document.getElementById("edit-id").value);

  const libOption = librarySelect.options[librarySelect.selectedIndex];
  const colOption = collectionSelect.options[collectionSelect.selectedIndex];

  const p = {
    name,
    tag: document.getElementById("p-tag").value.trim(),
    libraryID: librarySelect.value,
    libraryName: libOption
      ? libOption.dataset.name || libOption.textContent
      : "",
    collectionID: collectionSelect.value,
    collectionName: colOption ? colOption.dataset.name || "" : "",
    // Keep legacy 'collection' field for backward compat
    collection: colOption ? colOption.dataset.name || "" : "",
  };

  if (idx === -1) {
    projects.push(p);
  } else {
    projects[idx] = p;
  }

  await save();
  hideForm();
});

addBtn.addEventListener("click", () => showForm());
cancelBtn.addEventListener("click", hideForm);

// --- Sync ---

function startSync(project) {
  showToast(`Syncing "${project.name}"...`, 0);
  chrome.runtime.sendMessage(
    { action: "START_SYNC", project: project },
    (res) => {
      if (chrome.runtime.lastError) {
        showToast("Error connecting to background script.");
      }
    },
  );
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "UPDATE_STATUS") {
    showToast(
      msg.text,
      msg.text.includes("complete") || msg.text.includes("Error") ? 4000 : 0,
    );

    // Stop spinning if complete
    if (
      msg.text.includes("complete") ||
      msg.text.includes("Error") ||
      msg.text.includes("up to date")
    ) {
      render();
    }
  }
});

// --- Auto-Sync Settings ---

async function loadAutoSyncSettings() {
  const data = await chrome.storage.local.get("autoSyncSettings");
  const settings = data.autoSyncSettings || {};
  autoSyncPageVisit.checked = !!settings.syncOnPageVisit;
  autoSyncIntervalEnabled.checked = !!settings.intervalEnabled;
  autoSyncInterval.value = settings.intervalMinutes || "30";
  autoSyncInterval.disabled = !autoSyncIntervalEnabled.checked;
}

async function saveAutoSyncSettings() {
  const settings = {
    syncOnPageVisit: autoSyncPageVisit.checked,
    intervalEnabled: autoSyncIntervalEnabled.checked,
    intervalMinutes: parseInt(autoSyncInterval.value),
  };
  await chrome.storage.local.set({ autoSyncSettings: settings });
  chrome.runtime.sendMessage({ action: "UPDATE_AUTO_SYNC_SETTINGS", settings });
}

autoSyncPageVisit.addEventListener("change", saveAutoSyncSettings);
autoSyncIntervalEnabled.addEventListener("change", () => {
  autoSyncInterval.disabled = !autoSyncIntervalEnabled.checked;
  saveAutoSyncSettings();
});
autoSyncInterval.addEventListener("change", saveAutoSyncSettings);

load();
