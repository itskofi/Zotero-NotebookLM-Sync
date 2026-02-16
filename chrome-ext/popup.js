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

const nbSearchInput = document.getElementById("nb-search");
const nbDropdown = document.getElementById("nb-dropdown");
const nbClearBtn = document.getElementById("nb-clear");
const nbRefreshBtn = document.getElementById("nb-refresh");
const nbIdHidden = document.getElementById("p-notebookId");
const nbNameHidden = document.getElementById("p-notebookName");

// Tier UI elements
const tierBadge = document.getElementById("tier-badge");
const upgradeBanner = document.getElementById("upgrade-banner");
const syncStatsEl = document.getElementById("sync-stats");
const syncStatsText = document.getElementById("sync-stats-text");
const syncStatsFill = document.getElementById("sync-stats-fill");
const upgradePrompt = document.getElementById("upgrade-prompt");
const upgradePromptText = document.getElementById("upgrade-prompt-text");
const upgradePromptBtn = document.getElementById("upgrade-prompt-btn");
const autoSyncSection = document.getElementById("auto-sync-section");
const autoSyncProLabel = document.getElementById("auto-sync-pro-label");
const dedupDecisionModal = document.getElementById("dedup-decision-modal");
const dedupDecisionTitle = document.getElementById("dedup-decision-title");
const dedupDecisionText = document.getElementById("dedup-decision-text");
const dedupDecisionList = document.getElementById("dedup-decision-list");
const dedupDecisionMore = document.getElementById("dedup-decision-more");
const dedupSkipBtn = document.getElementById("dedup-skip-btn");
const dedupImportBtn = document.getElementById("dedup-import-btn");

let projects = [];
let notebookCache = [];
let highlightedIndex = -1;
let currentTierInfo = null; // { pro, tier, stats }
let dedupDecisionResolver = null;
let toastHideTimer = null;

const ZOTERO_HOST = "http://localhost:23119";
const TOAST_MIN_MS = 3000;
const TOAST_MAX_MS = 5000;
const TOAST_DEFAULT_MS = 4000;

// Initialize ExtPay for popup (no startBackground — that runs in the service worker)
initLicensing(false);

const icons = {
  plus: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`,
  pencil: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`,
  trash: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
  folder: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
  tag: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`,
  info: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
  library: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`,
  notebook: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="18" rx="2" ry="2"></rect><line x1="8" y1="3" x2="8" y2="21"></line></svg>`,
};

// Set the header icon
document.getElementById("add-project-btn").innerHTML = icons.plus;
const toastIconEl = document.querySelector("#status-toast i, #status-toast svg");
if (toastIconEl) {
  toastIconEl.outerHTML = icons.info;
} else {
  toast.insertAdjacentHTML("afterbegin", icons.info);
}

// --- Tier UI ---

function triggerUpgrade() {
  openPaymentPage();
  showToast("Opening upgrade page...", 3000);
}

upgradeBanner.addEventListener("click", triggerUpgrade);
upgradePromptBtn.addEventListener("click", triggerUpgrade);

async function updateTierUI() {
  // Ask background for tier info (it has the ExtPay instance)
  try {
    currentTierInfo = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "GET_TIER_INFO" }, resolve);
    });
  } catch {
    currentTierInfo = {
      pro: false,
      tier: TIERS.free,
      stats: { date: "", syncCount: 0, fileCount: 0 },
    };
  }

  const { pro, tier, stats } = currentTierInfo;

  // Badge
  tierBadge.textContent = pro ? "Pro" : "Free";
  tierBadge.className = "tier-badge " + (pro ? "pro" : "free");

  // Upgrade banner
  if (pro) {
    upgradeBanner.classList.add("hidden");
  } else {
    upgradeBanner.classList.remove("hidden");
  }

  // Sync stats (Free only)
  if (!pro && tier.maxSyncsPerDay !== Infinity) {
    syncStatsEl.classList.remove("hidden");
    const used = stats.syncCount || 0;
    const max = tier.maxSyncsPerDay;
    syncStatsText.textContent = `${used}/${max} syncs today`;
    const pct = Math.min((used / max) * 100, 100);
    syncStatsFill.style.width = pct + "%";
    syncStatsFill.className = "sync-stats-fill";
    if (pct >= 100) syncStatsFill.classList.add("full");
    else if (pct >= 60) syncStatsFill.classList.add("warning");
  } else {
    syncStatsEl.classList.add("hidden");
  }

  // Auto-sync Pro lock
  if (!pro) {
    autoSyncSection.classList.add("pro-locked");
    autoSyncProLabel.classList.remove("hidden");
    autoSyncProLabel.addEventListener("click", triggerUpgrade);
  } else {
    autoSyncSection.classList.remove("pro-locked");
    autoSyncProLabel.classList.add("hidden");
  }

  // Hide any stale upgrade prompt
  upgradePrompt.classList.add("hidden");
}

function showUpgradePrompt(message) {
  upgradePromptText.textContent = message;
  upgradePrompt.classList.remove("hidden");
}

function stopAllSyncSpinners() {
  document.querySelectorAll(".btn-sync svg").forEach((icon) => {
    icon.style.animation = "";
  });
}

function closeDedupDecisionModal(decision) {
  if (!dedupDecisionResolver) return;
  const resolve = dedupDecisionResolver;
  dedupDecisionResolver = null;
  dedupDecisionModal.classList.add("hidden");
  resolve(decision);
}

function openDedupDecisionModal(projectName, files = []) {
  if (dedupDecisionResolver) {
    closeDedupDecisionModal("skip");
  }

  dedupDecisionTitle.textContent = `Possible duplicates in "${projectName}"`;
  dedupDecisionText.textContent = `Detected ${files.length} possible duplicate(s). Choose whether to import anyway or skip.`;
  dedupDecisionList.innerHTML = "";

  if (files.length === 0) {
    const item = document.createElement("div");
    item.className = "dedup-modal-item";
    item.textContent = "No filenames provided by scanner.";
    dedupDecisionList.appendChild(item);
  } else {
    files.forEach((fileName, idx) => {
      const item = document.createElement("div");
      item.className = "dedup-modal-item";
      item.textContent = `${idx + 1}. ${fileName}`;
      dedupDecisionList.appendChild(item);
    });
  }

  dedupDecisionMore.textContent = "";
  dedupDecisionMore.classList.add("hidden");

  dedupDecisionModal.classList.remove("hidden");

  return new Promise((resolve) => {
    dedupDecisionResolver = resolve;
  });
}

dedupSkipBtn.addEventListener("click", () => closeDedupDecisionModal("skip"));
dedupImportBtn.addEventListener("click", () =>
  closeDedupDecisionModal("import_anyway"),
);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !dedupDecisionModal.classList.contains("hidden")) {
    closeDedupDecisionModal("skip");
  }
});
dedupDecisionModal.addEventListener("click", (e) => {
  if (e.target === dedupDecisionModal) {
    closeDedupDecisionModal("skip");
  }
});

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

// --- Notebook History + Dropdown ---

async function loadNotebooksFromHistory() {
  // Tier-aware history lookback and result limits
  const tier = currentTierInfo ? currentTierInfo.tier : TIERS.free;
  const lookbackMs = tier.notebookHistoryDays * 24 * 60 * 60 * 1000;
  const startTime = Date.now() - lookbackMs;
  const maxResults = tier.notebookMaxResults;
  try {
    const results = await chrome.history.search({
      text: "notebooklm.google.com/notebook/",
      startTime,
      maxResults,
    });

    const byId = {};
    for (const item of results) {
      const match = item.url.match(/\/notebook\/([^\/\?#]+)/);
      if (!match) continue;
      const id = match[1];
      let name = item.title || id;
      // Strip common prefixes from NotebookLM titles
      name = name.replace(/^NotebookLM\s*[-–—]\s*/i, "").trim();
      if (!name) name = id;

      if (!byId[id] || item.lastVisitTime > byId[id].lastVisitTime) {
        byId[id] = { id, name, lastVisitTime: item.lastVisitTime };
      }
    }

    notebookCache = Object.values(byId).sort(
      (a, b) => b.lastVisitTime - a.lastVisitTime,
    );
  } catch (e) {
    console.error("[Popup] Failed to load notebook history:", e);
    notebookCache = [];
  }
}

function formatTimeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function renderNotebookDropdown(filter = "") {
  nbDropdown.innerHTML = "";
  const lowerFilter = filter.toLowerCase();
  const filtered = notebookCache.filter(
    (nb) =>
      nb.name.toLowerCase().includes(lowerFilter) ||
      nb.id.toLowerCase().includes(lowerFilter),
  );

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "notebook-dropdown-empty";
    empty.textContent =
      notebookCache.length === 0
        ? "No notebooks found in history"
        : "No matching notebooks";
    nbDropdown.appendChild(empty);
    highlightedIndex = -1;
    return;
  }

  filtered.forEach((nb, i) => {
    const item = document.createElement("div");
    item.className = "notebook-dropdown-item";
    item.dataset.id = nb.id;
    item.dataset.name = nb.name;
    item.dataset.index = i;
    item.innerHTML = `
      <div class="nb-name">${escapeHtml(nb.name)}</div>
      <div class="nb-visited">Visited ${formatTimeAgo(nb.lastVisitTime)}</div>
    `;
    item.addEventListener("mousedown", (e) => {
      e.preventDefault(); // Prevent blur before selection
      selectNotebook(nb.id, nb.name);
      closeNotebookDropdown();
    });
    nbDropdown.appendChild(item);
  });
  highlightedIndex = -1;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function selectNotebook(id, name) {
  nbIdHidden.value = id;
  nbNameHidden.value = name;
  nbSearchInput.value = name;
  nbClearBtn.style.display = "block";
}

function clearNotebookSelection() {
  nbIdHidden.value = "";
  nbNameHidden.value = "";
  nbSearchInput.value = "";
  nbClearBtn.style.display = "none";
}

function openNotebookDropdown() {
  renderNotebookDropdown(nbSearchInput.value);
  nbDropdown.style.display = "block";
}

function closeNotebookDropdown() {
  nbDropdown.style.display = "none";
  highlightedIndex = -1;
}

function updateHighlight() {
  const items = nbDropdown.querySelectorAll(".notebook-dropdown-item");
  items.forEach((item, i) => {
    item.classList.toggle("highlighted", i === highlightedIndex);
  });
  if (highlightedIndex >= 0 && items[highlightedIndex]) {
    items[highlightedIndex].scrollIntoView({ block: "nearest" });
  }
}

nbSearchInput.addEventListener("focus", () => openNotebookDropdown());
nbSearchInput.addEventListener("input", () => {
  // If user types, clear the hidden selection (they're searching again)
  if (nbIdHidden.value) {
    nbIdHidden.value = "";
    nbNameHidden.value = "";
    nbClearBtn.style.display = "none";
  }
  renderNotebookDropdown(nbSearchInput.value);
  nbDropdown.style.display = "block";
});
nbSearchInput.addEventListener("blur", () => {
  // Small delay to allow mousedown on dropdown items to fire first
  setTimeout(() => closeNotebookDropdown(), 150);
});
nbSearchInput.addEventListener("keydown", (e) => {
  const items = nbDropdown.querySelectorAll(".notebook-dropdown-item");
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (nbDropdown.style.display !== "block") openNotebookDropdown();
    if (items.length > 0) {
      highlightedIndex = Math.min(highlightedIndex + 1, items.length - 1);
      updateHighlight();
    }
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (items.length > 0) {
      highlightedIndex = Math.max(highlightedIndex - 1, 0);
      updateHighlight();
    }
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (highlightedIndex >= 0 && items[highlightedIndex]) {
      const item = items[highlightedIndex];
      selectNotebook(item.dataset.id, item.dataset.name);
      closeNotebookDropdown();
    }
  } else if (e.key === "Escape") {
    closeNotebookDropdown();
    nbSearchInput.blur();
  }
});

nbClearBtn.addEventListener("click", () => {
  clearNotebookSelection();
  nbSearchInput.focus();
});

nbRefreshBtn.addEventListener("click", async () => {
  nbRefreshBtn.textContent = "Loading...";
  await loadNotebooksFromHistory();
  nbRefreshBtn.textContent = "Refresh notebook list";
  if (nbDropdown.style.display === "block") {
    renderNotebookDropdown(nbSearchInput.value);
  }
});

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
  await updateTierUI();
  const data = await chrome.storage.local.get("projects");
  projects = data.projects || [];
  render();
  await loadAutoSyncSettings();
  await showLastDedupReportNotice();
}

function showToast(text, duration = TOAST_DEFAULT_MS) {
  toastText.textContent = text;
  toast.classList.add("show");

  if (toastHideTimer) {
    clearTimeout(toastHideTimer);
  }

  const requestedDuration = Number(duration);
  const baseDuration =
    Number.isFinite(requestedDuration) && requestedDuration > 0
      ? requestedDuration
      : TOAST_DEFAULT_MS;
  const hideAfter = Math.min(TOAST_MAX_MS, Math.max(TOAST_MIN_MS, baseDuration));

  toastHideTimer = setTimeout(() => {
    toast.classList.remove("show");
    toastHideTimer = null;
  }, hideAfter);
}

async function showLastDedupReportNotice() {
  try {
    const data = await chrome.storage.local.get("lastDedupReport");
    const report = data.lastDedupReport;
    if (!report || !report.timestamp) return;

    // Avoid showing stale messages from much older sync runs.
    if (Date.now() - report.timestamp > 24 * 60 * 60 * 1000) return;

    const blockedCount = Array.isArray(report.blockedPossibleDuplicates)
      ? report.blockedPossibleDuplicates.length
      : 0;
    const duplicateGroupCount = Array.isArray(report.existingNotebookDuplicates)
      ? report.existingNotebookDuplicates.length
      : 0;

    if (blockedCount === 0 && duplicateGroupCount === 0) return;

    const parts = [];
    if (blockedCount > 0) {
      parts.push(`${blockedCount} possible duplicate(s) blocked`);
    }
    if (duplicateGroupCount > 0) {
      parts.push(`${duplicateGroupCount} duplicate group(s) in notebook`);
    }

    showToast(`Last dedup report: ${parts.join(" | ")}`, 5000);
  } catch (e) {
    console.warn("[Popup] Failed to read dedup report:", e);
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
      if (p.notebookName) {
        metaHtml += `
                    <div class="meta-item">
                        ${icons.notebook}
                        <span>${p.notebookName}</span>
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
      stopAllSyncSpinners();
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

  // Reset notebook selection
  clearNotebookSelection();
  if (p && p.notebookId) {
    selectNotebook(p.notebookId, p.notebookName || p.notebookId);
  }

  mainView.classList.add("hidden");
  formView.classList.remove("hidden");

  // Load notebooks from history (non-blocking)
  loadNotebooksFromHistory();

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
    notebookId: nbIdHidden.value,
    notebookName: nbNameHidden.value,
  };

  if (idx === -1) {
    // Double-check project limit before saving (in case state changed)
    const tier = currentTierInfo ? currentTierInfo.tier : TIERS.free;
    const maxProjects = tier?.maxProjects ?? TIERS.free.maxProjects;
    if (maxProjects !== Infinity && projects.length >= maxProjects) {
      showUpgradePrompt(
        `You've reached the free project limit (${maxProjects}). Upgrade to Pro for unlimited projects.`,
      );
      hideForm();
      return;
    }
    projects.push(p);
  } else {
    projects[idx] = p;
  }

  await save();
  hideForm();
});

addBtn.addEventListener("click", () => {
  // Tier enforcement: project limit
  const tier = currentTierInfo ? currentTierInfo.tier : TIERS.free;
  const maxProjects = tier?.maxProjects ?? TIERS.free.maxProjects;
  if (maxProjects !== Infinity && projects.length >= maxProjects) {
    showUpgradePrompt(
      `You've reached the free project limit (${maxProjects}). Upgrade to Pro for unlimited projects.`,
    );
    return;
  }
  showForm();
});
cancelBtn.addEventListener("click", hideForm);

// --- Sync ---

function startSync(project) {
  showToast(`Syncing "${project.name}"...`, 0);
  chrome.runtime.sendMessage(
    { action: "START_SYNC", project: project },
    (res) => {
      if (chrome.runtime.lastError) {
        stopAllSyncSpinners();
        showToast("Error connecting to background script.");
      }
    },
  );
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "DEDUP_DECISION_REQUIRED") {
    const files = Array.isArray(msg.files) ? msg.files : [];
    const projectName = msg.projectName || "this project";
    openDedupDecisionModal(projectName, files).then((decision) => {
      sendResponse({ decision });
    });
    return true;
  }

  if (msg.action === "UPDATE_STATUS") {
    showToast(msg.text, 0);
    return false;
  }

  if (msg.action === "SYNC_DONE") {
    stopAllSyncSpinners();
    render();
    updateTierUI();
    return false;
  }

  return false;
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

autoSyncPageVisit.addEventListener("change", () => {
  if (!currentTierInfo?.pro) {
    autoSyncPageVisit.checked = false;
    showUpgradePrompt("Auto-sync is a Pro feature. Upgrade to enable it.");
    return;
  }
  saveAutoSyncSettings();
});
autoSyncIntervalEnabled.addEventListener("change", () => {
  if (!currentTierInfo?.pro) {
    autoSyncIntervalEnabled.checked = false;
    showUpgradePrompt("Auto-sync is a Pro feature. Upgrade to enable it.");
    return;
  }
  autoSyncInterval.disabled = !autoSyncIntervalEnabled.checked;
  saveAutoSyncSettings();
});
autoSyncInterval.addEventListener("change", saveAutoSyncSettings);

load();
