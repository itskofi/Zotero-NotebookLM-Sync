# Zotero Connector for NotebookLM

Dieses Projekt verbindet Zotero mit Google NotebookLM, damit du Anhänge aus deiner Bibliothek direkt in Notebooks synchronisieren kannst. Die Lösung besteht aus zwei Teilen: einem Zotero-Plugin mit lokalen HTTP-Endpunkten und einer Chrome-Extension als Sync-Orchestrator. Du definierst in der Extension Projekte mit Filtern (Library, Collection, Tag) und optional einem festen Ziel-Notebook. Beim Sync werden Dateien aus Zotero geladen, gegen den lokalen Verlauf geprüft und dann gebündelt in NotebookLM hochgeladen. Für die Monetarisierung ist eine Free/Pro-Logik mit ExtPay integriert, inklusive Daily-Limits und Pro-Features wie Auto-Sync. Die Installation erfolgt ohne Build-System: die Extension wird lokal geladen, das Zotero-Plugin als XPI installiert.

## Schnellstart

### 1) Zotero-Plugin installieren
1. Öffne Zotero 7.
2. Gehe zu **Tools -> Plugins**.
3. Installiere `notebooklm-sync.xpi` über **Install Plugin From File...**.
4. Starte Zotero neu.

### 2) Chrome-Extension laden
1. Öffne `chrome://extensions`.
2. Aktiviere **Developer mode**.
3. Klicke **Load unpacked** und wähle den Ordner `chrome-ext/`.

### 3) Ersten Sync auslösen
1. Öffne ein Notebook in NotebookLM.
2. Öffne das Extension-Popup und lege ein Projekt an.
3. Wähle Library/Collection/Tag und optional ein Ziel-Notebook.
4. Klicke auf **Sync**.

## Weiterführende Dokumentation
- Plugin-Handbuch: [`docs/plugin-dokumentation.md`](docs/plugin-dokumentation.md)
- Stripe/ExtPay-Setup: [`docs/setup-stripe-extpay.md`](docs/setup-stripe-extpay.md)

## Known Limitations
- Während des Uploads zeigt Chrome „Debugger attached“ an. Das ist erwartet, weil der Upload über die Chrome-Debugger-API automatisiert wird.
- Die Upload-Automation hängt von der aktuellen NotebookLM-Oberfläche ab. Wenn Google UI/Selektoren ändert, kann eine Anpassung in `chrome-ext/content.js` und `chrome-ext/background.js` nötig sein.
