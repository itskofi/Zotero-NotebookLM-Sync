# Wie das Plugin funktioniert

## 1. Kurzüberblick

Das Plugin synchronisiert Datei-Anhänge aus Zotero nach NotebookLM. Dafür arbeiten ein Zotero-Plugin (lokale API auf `localhost`) und eine Chrome-Extension zusammen.

## 2. Komponenten und Rollen

- Zotero-Plugin: `/Users/kofi/Documents/noterolm-sync/zotero-plugin/bootstrap.js`
- Popup-UI: `/Users/kofi/Documents/noterolm-sync/chrome-ext/popup.js`
- Background-Orchestrierung: `/Users/kofi/Documents/noterolm-sync/chrome-ext/background.js`
- NotebookLM-Injection: `/Users/kofi/Documents/noterolm-sync/chrome-ext/content.js`
- Lizenzlogik (Free/Pro): `/Users/kofi/Documents/noterolm-sync/chrome-ext/licensing.js`

### Wer macht was

- Das Zotero-Plugin liefert Listen und Dateien über HTTP.
- Das Popup verwaltet Projekte, Filter, Notebook-Auswahl und Auto-Sync-Settings.
- Das Background-Script führt den eigentlichen Sync aus.
- Das Content-Script öffnet den Upload-Dialog in NotebookLM.
- Der CDP-Teil im Background injiziert Dateien direkt in das File-Input.

## 3. Datenfluss Ende-Zu-Ende

```text
Popup (Projekt + Klick auf Sync)
  -> chrome.runtime.sendMessage("START_SYNC")
Background
  -> POST http://localhost:23119/notebooklm/list
  -> POST http://localhost:23119/notebooklm/file (pro Datei)
  -> NotebookLM-Tab finden/öffnen
  -> Upload-Dialog via content.js öffnen
  -> Dateien per CDP ins File-Input injizieren
  -> syncHistory + syncStats in chrome.storage.local schreiben
Popup
  <- Statusmeldungen über "UPDATE_STATUS"
```

## 4. Ablauf bei einem manuellen Sync

1. Nutzer klickt im Popup auf `Sync`.
2. Background prüft zuerst Tier-Limits (z. B. Daily-Limit im Free-Plan).
3. Background lädt die Trefferliste aus Zotero (`/notebooklm/list`) anhand der Projektfilter.
4. Treffer werden nach erlaubten MIME-Typen für den aktuellen Plan gefiltert.
5. Ziel-Notebook wird bestimmt (bevorzugt gespeicherte `notebookId`, sonst ein bereits geöffneter NotebookLM-Tab).
6. Über `syncHistory` wird geprüft, welche Dateien neu oder geändert sind.
7. Dateien werden in Batches geladen (`/notebooklm/file`) und als Base64 vorbereitet.
8. Upload-Dialog wird geöffnet, dann werden Dateien per CDP in den Datei-Input gesetzt.
9. Bei Erfolg werden `syncHistory` und `syncStats` aktualisiert.
10. Das Popup zeigt Fortschritt/Fehler per Toast an.

## 5. Filterlogik im Projekt

Ein Projekt kann folgende Filter kombinieren:

- `libraryID`
- `collectionID` (bevorzugt) oder `collectionName` (Legacy)
- `tag`
- `notebookId` als festes Ziel-Notebook

Wenn kein Filter gesetzt ist, wird entsprechend der Zotero-Suchlogik eine breite Auswahl synchronisiert (unter Berücksichtigung von Tier-Limits).

## 6. Deduplizierung und Änderungslogik

Der Sync lädt nicht blind alles erneut hoch. Es wird ein Schlüssel pro Notebook und Datei verwendet:

- Key: `${notebookId}_${fileId}`
- Speicherung in `syncHistory`
- Vergleich über `hash`, `dateModified` und optional `version`

Nur wenn eine Datei neu ist oder sich geändert hat, wird sie erneut in NotebookLM injiziert.

## 7. Free/Pro-Verhalten

Die Limits kommen direkt aus `/Users/kofi/Documents/noterolm-sync/chrome-ext/config.js`.

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

## 8. Auto-Sync

Es gibt zwei Trigger:

- Alarm-basiert (`chrome.alarms`, Intervall aus Popup)
- Seitenaufruf-basiert (`tabs.onUpdated` auf NotebookLM-Notebook-URL)

Wichtig:

- Auto-Sync ist nur im Pro-Plan aktiv.
- Falls kein Projekt eine gespeicherte `notebookId` hat, muss mindestens ein NotebookLM-Notebook-Tab geöffnet sein.

## 9. Persistente Daten in `chrome.storage.local`

- `projects`: Projektdefinitionen
- `syncHistory`: Verlauf pro Notebook/Datei
- `syncStats`: Tageszähler (`date`, `syncCount`, `fileCount`)
- `autoSyncSettings`: Auto-Sync-Konfiguration

## 10. Öffentliche interne Schnittstellen

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

## 11. Häufige Fehlerbilder

| Problem | Ursache | Fix |
|---|---|---|
| „Cannot connect to Zotero“ | Zotero/Plugin nicht aktiv | Zotero starten und Plugin-Installation prüfen |
| „No notebook selected“ | Keine `notebookId` und kein offener NotebookLM-Tab | Projekt auf ein Notebook setzen oder NotebookLM-Tab öffnen |
| Daily-Limit erreicht | Free-Plan-Limit überschritten | Auf nächsten Tag warten oder auf Pro wechseln |
| Upload-Dialog wird nicht gefunden | NotebookLM-UI geändert oder nicht fertig geladen | NotebookLM neu laden, ggf. Upload manuell öffnen, Selektoren prüfen |
| Content-Script Kommunikation fehlschlägt | Tab-Zustand inkonsistent | NotebookLM-Tab reloaden, Extension neu laden, erneut syncen |

## 12. Betrieb und Wartung

- Extension aktualisieren: `chrome://extensions` -> Reload.
- Zotero-Plugin neu paketieren: Inhalt von `/Users/kofi/Documents/noterolm-sync/zotero-plugin/` zippen und als `.xpi` installieren.

Nach Änderungen immer Smoke-Test ausführen:
1. Projekt anlegen/bearbeiten/löschen.
2. Libraries/Collections laden.
3. Ein manueller Sync erfolgreich.
4. Free/Pro-Gating verhält sich korrekt.
