# Plugin-Dokumentation: Zotero Connector for NotebookLM

## 1. Zielbild und Komponenten

Der Connector synchronisiert Anhänge aus Zotero in ein NotebookLM-Notebook. Die Architektur besteht aus zwei Modulen:

- Zotero-Plugin: `/Users/kofi/Documents/noterolm-sync/zotero-plugin/bootstrap.js`
- Chrome-Extension Popup: `/Users/kofi/Documents/noterolm-sync/chrome-ext/popup.js`
- Chrome-Extension Background: `/Users/kofi/Documents/noterolm-sync/chrome-ext/background.js`
- Chrome-Extension Content-Script: `/Users/kofi/Documents/noterolm-sync/chrome-ext/content.js`

### Verantwortlichkeiten
- Zotero-Plugin stellt lokale Endpunkte auf `http://localhost:23119` bereit.
- Popup verwaltet Projekte, Auto-Sync-Settings und Tier-UI.
- Background orchestriert Sync, Deduplizierung, Tier-Limits und Upload-Injektion.
- Content-Script öffnet den NotebookLM-Upload-Dialog robust über Selektor-Fallbacks.

## 2. Voraussetzungen

- Zotero 7 läuft lokal.
- Das Plugin ist installiert und aktiv.
- NotebookLM ist erreichbar (`https://notebooklm.google.com/*`).
- Die Extension ist lokal über `chrome://extensions` geladen.
- Für Pro-Features ist ExtPay konfiguriert.

## 3. Bedienung im Popup

### Projekte anlegen/bearbeiten/löschen
- Neues Projekt über `+`.
- Bearbeiten über Stift-Icon.
- Löschen über Papierkorb-Icon.

### Verfügbare Filter
- **Library**: aus Zotero-Endpunkt `/notebooklm/libraries`.
- **Collection**: aus `/notebooklm/collections`, inklusive Baumstruktur.
- **Tag**: optionaler exakter Tag-Filter.

### Notebook-Auswahl
- Notebook-Auswahl wird aus Browser-History (`chrome.history.search`) befüllt.
- Bei Auswahl wird `notebookId` + `notebookName` im Projekt gespeichert.
- Ohne gespeicherte `notebookId` nutzt der Sync einen bereits geöffneten NotebookLM-Tab (Legacy-Fallback).

## 4. Sync-Ablauf (technisch korrekt, kompakt)

1. Background erhält `START_SYNC` mit Projekt.
2. Abruf der Dateiliste über `POST /notebooklm/list`.
3. Tier-bedingte MIME-Filterung und Limits.
4. Ziel-Notebook bestimmen (bevorzugt gespeicherte `notebookId`, sonst offener NotebookLM-Tab).
5. Deduplizierung über `syncHistory` (Schlüssel `${notebookId}_${fileId}`).
6. Dateiinhalt laden über `POST /notebooklm/file`.
7. Batch-Upload via Chrome Debugger Protocol (CDP), inklusive Dateiinjektion in den Upload-Input.
8. `syncHistory` und `syncStats` aktualisieren.

## 5. Free/Pro-Tiers (exakt aus `chrome-ext/config.js`)

| Merkmal | Free | Pro |
|---|---:|---:|
| `maxProjects` | 1 | Infinity |
| `maxSyncsPerDay` | 5 | Infinity |
| `maxFilesPerSync` | 10 | Infinity |
| `batchSize` | 3 | 10 |
| `batchPauseMs` | 5000 | 2000 |
| `autoSyncEnabled` | false | true |
| `allowedMimeTypes` | `application/pdf` | `application/pdf`, `text/plain`, `text/markdown`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| `notebookHistoryDays` | 7 | 180 |
| `notebookMaxResults` | 5 | 500 |

## 6. Auto-Sync-Verhalten

### Alarm-basiert
- Einstellung im Popup (`autoSyncSettings.intervalEnabled`, `intervalMinutes`).
- Alarmname: `autoSync`.
- Nur aktiv, wenn `tier.autoSyncEnabled === true` (Pro).

### Page-Visit-basiert
- Trigger bei `tabs.onUpdated` auf NotebookLM-Notebook-URL.
- Wenn `autoSyncSettings.syncOnPageVisit === true`, startet Auto-Sync mit kurzer Verzögerung.

### Verhalten ohne gespeichertes Notebook
- Hat **kein** Projekt eine `notebookId`, wird ein bereits geöffneter NotebookLM-Notebook-Tab benötigt.
- Ohne solchen Tab wird Auto-Sync übersprungen.

## 7. Lokale Datenhaltung (`chrome.storage.local`)

### `projects`
Array mit Projektobjekten:
- `name`
- `tag`
- `libraryID`
- `libraryName`
- `collectionID`
- `collectionName`
- `collection` (Legacy-Feld)
- `notebookId`
- `notebookName`

### `syncHistory`
Objekt mit Key `${notebookId}_${attachmentId}` und Werten:
- `hash`
- `dateModified`
- `version`
- `timestamp`

### `syncStats`
- `date` (`YYYY-MM-DD`)
- `syncCount`
- `fileCount`

### `autoSyncSettings`
- `syncOnPageVisit` (boolean)
- `intervalEnabled` (boolean)
- `intervalMinutes` (number)

## 8. Schnittstellen (bestehend)

### Zotero-Endpunkte
- `POST /notebooklm/list`
- `POST /notebooklm/file`
- `POST /notebooklm/libraries`
- `POST /notebooklm/collections`

### Runtime-Messages
- `START_SYNC`
- `UPDATE_AUTO_SYNC_SETTINGS`
- `GET_TIER_INFO`
- `UPDATE_STATUS`

## 9. Troubleshooting-Matrix

| Problem | Typische Ursache | Konkreter Fix |
|---|---|---|
| Zotero nicht erreichbar | Zotero nicht gestartet oder Plugin nicht aktiv | Zotero starten, Plugin prüfen, dann im Popup erneut Library laden |
| Kein Notebook gewählt | Projekt hat keine `notebookId` und kein offener NotebookLM-Tab vorhanden | Projekt bearbeiten und Notebook auswählen oder NotebookLM-Notebook vorab öffnen |
| Daily-Limit erreicht | Free-Limit `maxSyncsPerDay` ausgeschöpft | Bis Tagesreset warten oder auf Pro upgraden |
| Upload-Dialog nicht gefunden | NotebookLM-UI/Selektoren haben sich geändert oder Seite nicht vollständig geladen | NotebookLM-Tab neu laden, Upload einmal manuell öffnen, ggf. Selektoren in `content.js`/`background.js` aktualisieren |
| Content-Script nicht erreichbar | Content-Script nicht injiziert/Tab-Zustand inkonsistent | NotebookLM-Tab neu laden; Extension-Reload in `chrome://extensions`; Sync erneut starten |

## 10. Betrieb und Änderungen

### Extension neu laden
- `chrome://extensions` öffnen.
- Bei der Extension auf **Reload** klicken.

### Zotero-Plugin (XPI) neu bauen
- Inhalt von `/Users/kofi/Documents/noterolm-sync/zotero-plugin/` als ZIP archivieren.
- ZIP in `.xpi` umbenennen.
- In Zotero erneut über „Install Plugin From File...“ installieren.

### Manuelle Smoke-Checks nach Änderungen
1. Popup öffnet und Projekt-CRUD funktioniert.
2. Libraries/Collections werden aus Zotero geladen.
3. Ein manueller Sync lädt mindestens eine Datei erfolgreich.
4. Bei Free-Account greifen die Limits sichtbar.
