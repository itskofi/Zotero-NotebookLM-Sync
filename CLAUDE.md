# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Zotero to NotebookLM Connector — a bridge that syncs research documents from Zotero into Google NotebookLM. Consists of two components: a Zotero 7 plugin and a Chrome Extension (Manifest v3). Pure JavaScript, zero external dependencies, no build system.

## Project Structure

- **`chrome-ext/`** — Chrome Extension (Manifest v3)
  - `popup.js` — UI for managing sync projects (CRUD, local storage persistence)
  - `background.js` — Main sync orchestrator (fetches from Zotero, tracks history, batch-uploads via CDP)
  - `content.js` — Runs on NotebookLM pages; opens upload dialog via DOM manipulation with multi-selector fallbacks
  - `manifest.json` — Extension config (permissions: activeTab, scripting, debugger, storage)
- **`zotero-plugin/`** — Zotero 7 Plugin
  - `bootstrap.js` — Registers HTTP endpoints on `localhost:23119` for file listing and serving
  - `manifest.json` — Plugin metadata (addon ID: `notebooklm-sync@erkam.dev`)
- **`notebooklm-sync.xpi`** — Packaged Zotero plugin (ZIP archive)

## Development Workflow

No build tools, package manager, linter, or test framework. The Chrome extension is loaded unpacked from `chrome-ext/`. The Zotero plugin is installed from the `.xpi` file. Manual testing via browser console and Zotero debug output.

To reload changes:

- **Chrome extension**: Go to `chrome://extensions` and click the reload button
- **Zotero plugin**: Rebuild `.xpi` by zipping the `zotero-plugin/` directory contents

## Architecture

### Communication Flow

```
Zotero Plugin (HTTP server on :23119)
    ↕ fetch (POST JSON, header: Zotero-Allowed-Request: true)
Chrome background.js (orchestrator)
    ↕ chrome.runtime messaging + chrome.debugger CDP
Chrome content.js (on NotebookLM tab)
```

### Zotero Plugin Endpoints

- `POST /notebooklm/list` — Returns attachments matching filters (collection, tag, libraryID). Body: `{ collection?, tag?, libraryID? }`
- `POST /notebooklm/file` — Returns file data as base64. Body: `{ itemID }`

### Sync Process (background.js)

1. Fetches matching files from Zotero via HTTP
2. Filters by MIME type whitelist (PDF, TXT, MD, DOCX)
3. Deduplicates using per-notebook history keyed by `${notebookId}_${fileId}` (compares hash + dateModified)
4. Batches files (10 per batch, 2s pause between batches)
5. Injects into NotebookLM via Chrome DevTools Protocol (CDP) — suppresses native file picker, creates File objects, dispatches React-compatible change/input events

### Content Script UI Detection (content.js)

Uses a multi-tier element detection strategy with fallbacks:

1. CSS selectors (e.g., `[xapscottyuploadertrigger]`)
2. Fallback class/attribute selectors
3. Text pattern matching (supports English and Turkish)
4. Visibility verification via computed styles

## Key Conventions

- Console log prefixes: `[Sync]`, `[CDP]`, `[Injector]`, `[Zotero]`
- camelCase functions, UPPERCASE constants (e.g., `ZOTERO_HOST`, `BATCH_SIZE`, `SELECTORS`)
- File filtering: case-insensitive collection/tag matching, excludes non-attachment items
- Retry logic: content script messaging retries up to 3 times
- Storage: `chrome.storage.local` for projects and sync history
