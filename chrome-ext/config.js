/**
 * Tier configuration for Free and Pro plans.
 * Shared between background.js (service worker) and popup.js.
 */

const TIERS = {
  free: {
    maxProjects: 1,
    maxSyncsPerDay: 5,
    maxFilesPerSync: 10,
    batchSize: 3,
    batchPauseMs: 5000,
    autoSyncEnabled: false,
    allowedMimeTypes: ["application/pdf"],
    notebookHistoryDays: 7,
    notebookMaxResults: 5,
  },
  pro: {
    maxProjects: Infinity,
    maxSyncsPerDay: Infinity,
    maxFilesPerSync: Infinity,
    batchSize: 10,
    batchPauseMs: 2000,
    autoSyncEnabled: true,
    allowedMimeTypes: [
      "application/pdf",
      "text/plain",
      "text/markdown",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    notebookHistoryDays: 180,
    notebookMaxResults: 500,
  },
};
