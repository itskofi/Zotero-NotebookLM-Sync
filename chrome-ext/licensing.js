/**
 * Licensing module — wraps ExtPay with caching and tier-aware helpers.
 * Requires config.js and ExtPay.js to be loaded first.
 */

const EXTPAY_ID = "notebooklm-sync"; // Must match your ExtensionPay dashboard ID

let _extpay = null;
let _cachedUser = null;
let _cacheTs = 0;
let _getUserPromise = null;
const _CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Call with background=true from background.js (service worker).
 * Call with background=false from popup.js (just needs openPaymentPage).
 */
function initLicensing(background = true) {
  if (typeof ExtPay === "function") {
    _extpay = ExtPay(EXTPAY_ID);

    if (background) {
      _extpay.startBackground();

      // Invalidate cache when payment status changes
      _extpay.onPaid.addListener(() => {
        _cachedUser = null;
        _cacheTs = 0;
        // Re-evaluate auto-sync alarm with new tier
        if (typeof setupAutoSyncAlarm === "function") {
          setupAutoSyncAlarm();
        }
      });
    }
  } else {
    console.warn("[Licensing] ExtPay not loaded — all users treated as Free");
  }
}

async function _getUser() {
  if (!_extpay) return { paid: false };

  const now = Date.now();
  if (_cachedUser && now - _cacheTs < _CACHE_TTL) {
    return _cachedUser;
  }

  // Deduplicate concurrent calls with a promise lock
  if (_getUserPromise) return _getUserPromise;

  _getUserPromise = (async () => {
    try {
      _cachedUser = await _extpay.getUser();
      _cacheTs = Date.now();
      return _cachedUser;
    } catch (e) {
      console.error("[Licensing] Failed to get user:", e);
      return { paid: false };
    } finally {
      _getUserPromise = null;
    }
  })();

  return _getUserPromise;
}

async function isPro() {
  const user = await _getUser();
  return !!user.paid;
}

async function getTierConfig() {
  const pro = await isPro();
  return pro ? TIERS.pro : TIERS.free;
}

function openPaymentPage() {
  if (_extpay) {
    _extpay.openPaymentPage();
  }
}

// --- Sync Stats (daily counter for Free tier limits) ---

function _todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function getSyncStats() {
  const data = await chrome.storage.local.get("syncStats");
  const stats = data.syncStats || {};
  // Reset if day changed
  if (stats.date !== _todayKey()) {
    return { date: _todayKey(), syncCount: 0, fileCount: 0 };
  }
  return stats;
}

async function incrementSyncStats(filesSynced) {
  const stats = await getSyncStats();
  stats.syncCount += 1;
  stats.fileCount += filesSynced;
  stats.date = _todayKey();
  await chrome.storage.local.set({ syncStats: stats });
  return stats;
}

/**
 * Check if the user can start a sync. Returns { allowed, reason? }.
 */
async function canSync() {
  const tier = await getTierConfig();
  if (tier.maxSyncsPerDay === Infinity) return { allowed: true };

  const stats = await getSyncStats();
  if (stats.syncCount >= tier.maxSyncsPerDay) {
    return {
      allowed: false,
      reason: `Daily sync limit reached (${tier.maxSyncsPerDay}/${tier.maxSyncsPerDay}). Resets tomorrow or upgrade to Pro for unlimited syncs.`,
    };
  }
  return { allowed: true };
}
