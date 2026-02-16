# Setup-Anleitung: Stripe + ExtPay (inkl. Testbetrieb und Go-Live)

## 1. Ziel und Scope

Diese Anleitung beschreibt die Monetarisierung der Extension über **ExtPay + Stripe** für:
- **One-time (Einmalkauf)** und
- **Subscription (monatlich/jährlich)**.

Sie deckt den kompletten Weg ab: Erstkonfiguration, Testbetrieb, Verifikation und Go-Live.

## 2. Architekturüberblick

- Die Extension spricht **nicht direkt** mit Stripe.
- Die Lizenzlogik läuft über ExtPay (`ExtPay.js`), Stripe ist das Zahlungs-Backend hinter ExtPay.
- In deinem Code wird der Paid-Status über `getUser()` ausgewertet; das Upgrade-Fenster öffnet `openPaymentPage()`.

Relevante Dateien:
- `/Users/kofi/Documents/noterolm-sync/chrome-ext/licensing.js`
- `/Users/kofi/Documents/noterolm-sync/chrome-ext/background.js`
- `/Users/kofi/Documents/noterolm-sync/chrome-ext/popup.js`
- `/Users/kofi/Documents/noterolm-sync/chrome-ext/manifest.json`

## 3. Schritt-für-Schritt Setup

### Schritt 1: ExtPay-Account anlegen
1. Auf `https://extensionpay.com` registrieren.
2. Neue Extension in ExtPay anlegen.
3. Die erzeugte ExtPay-Extension-ID notieren.

### Schritt 2: Extension in ExtPay registrieren
1. In ExtPay Name/Beschreibung deiner Extension setzen.
2. Zahlungsmodelle aktivieren: One-time und Subscription-Pläne.
3. Optional: Trial/Login/Plan-Kombinationen konfigurieren.

### Schritt 3: Stripe verbinden und verifizieren
1. In ExtPay den Stripe-Connect-Flow starten.
2. Stripe-Account erstellen oder verbinden.
3. KYC/Verifikation in Stripe vollständig abschließen.
4. Nach Verifikation prüfen, dass Zahlungen in ExtPay als „connected“ angezeigt werden.

### Schritt 4: Pläne konfigurieren (One-time + monatlich/jährlich)
Empfohlene Minimalstruktur:
- Plan A: Lifetime (One-time)
- Plan B: Pro Monthly
- Plan C: Pro Yearly

Best Practices:
- Einheitliche Währung für Kernmärkte.
- Klarer Vorteil von yearly vs. monthly.
- Gleiche Feature-Freischaltung für alle Pro-Pläne, falls kein Multi-Tier-Produkt nötig ist.

## 4. Code-Mapping auf dieses Repo

### 4.1 `EXTPAY_ID` korrekt setzen
In `/Users/kofi/Documents/noterolm-sync/chrome-ext/licensing.js`:
- `const EXTPAY_ID = "zotero-notebooklm-sync";`
- Dieser Wert muss exakt der Extension-ID im ExtPay-Dashboard entsprechen.

### 4.2 Initialisierung korrekt getrennt
- Service Worker: `initLicensing()` (mit `startBackground()` intern).
- Popup: `initLicensing(false)` (nur UI-/Payment-Aktionen).

### 4.3 Manifest-Pflichtpunkte prüfen
In `/Users/kofi/Documents/noterolm-sync/chrome-ext/manifest.json`:
- `"permissions"` enthält `"storage"`.
- `"host_permissions"` enthält `"https://extensionpay.com/*"`.
- `content_scripts` enthält `ExtPay.js` auf `https://extensionpay.com/*` mit `"run_at": "document_start"`.

### 4.4 Paid-State wird im Produkt korrekt genutzt
- Tier-Entscheidung erfolgt über `isPro()`/`getTierConfig()`.
- UI zeigt Upgrade-Banner/Prompt und blockiert Pro-only Features (z. B. Auto-Sync).

## 5. Testmodus

### 5.1 Lokal testen (Developer Mode)
1. `chrome://extensions` -> **Developer mode** aktivieren.
2. Extension via **Load unpacked** laden.
3. Upgrade-Flow im Popup auslösen (`openPaymentPage`).
4. Testkauf gemäß ExtPay-Testfluss durchführen.

Hinweis: Laut ExtPay-Doku kann im Developer-Mode ein simulierter Paid-Flow über das ExtensionPay-Formular durchgeführt werden; echte Stripe-Transaktionen fallen dabei nicht an.

### 5.2 Unpaid/Paid-Zustände validieren
- **Unpaid**: Tier-Badge „Free“ sichtbar; Limitierungen greifen (z. B. max. 1 Projekt, Auto-Sync gesperrt).
- **Paid**: Tier-Badge „Pro“ sichtbar; Pro-Features sind aktiv; Daily-/Projekt-Limits entfallen gemäß `config.js`.

### 5.3 Reset-/Retest-Hinweise
Für saubere Retests ggf. gespeicherte Lizenzdaten zurücksetzen (in Extension-Storage):
- `extensionpay_api_key`
- `extensionpay_user`
- `extensionpay_installed_at`

Danach Extension neu laden und Test erneut durchführen.

## 6. Go-Live-Checkliste

Vor Live-Schaltung müssen alle Punkte erfüllt sein:

1. Stripe-Account vollständig verifiziert.
2. Alle geplanten Pläne in ExtPay aktiv.
3. Testfälle „unpaid -> paid -> pro unlocked“ erfolgreich.
4. Refund-Prozess einmal durchgespielt (operativ dokumentiert).
5. Datenschutzhinweise und Produkttexte aktualisiert.
6. Extension im Store veröffentlicht (nicht nur lokal geladen).
7. End-to-End-Kauf im veröffentlichten Build validiert.
8. Monitoring-/Supportprozess für Zahlungsprobleme eingerichtet.

## 7. Betriebsleitfaden

### Preisänderungen
- Preise primär in ExtPay/Stripe anpassen.
- Vorab entscheiden, ob Bestandsnutzer alte Konditionen behalten (Grandfathering).
- Änderungen mit Datum intern dokumentieren.

### Planmigrationen
- Klar definieren, welche Features planübergreifend identisch sind.
- Nach Migration immer Paid-State und UI-Gating testen.

### Rückerstattungen
- Rückerstattungen operativ im Stripe-Dashboard ausführen.
- Support-Fall dokumentieren (Kaufdatum, E-Mail, Grund, Refund-Status).

### Monitoring von Supportfällen
Typische Anfrage: „Bezahlt, aber weiterhin Free“.
Prüfen:
1. Korrekte `EXTPAY_ID` im Build.
2. Manifest-Pflichtpunkte (insb. ExtPay-Content-Script).
3. Erfolgreicher Abruf von `getUser()` (Console/Logs).
4. Nutzer ggf. erneut über Payment-/Login-Seite authentifizieren.

## 8. Security- und Compliance-Hinweise

### Was bei ExtPay/Stripe verarbeitet wird
- Zahlungs- und Abrechnungsdaten liegen bei Stripe (über ExtPay-Integration).
- Lizenz-/Paid-Zustandsverwaltung läuft über ExtPay.

### Was lokal in der Extension gespeichert wird
- Projekt- und Sync-Metadaten in `chrome.storage.local`.
- Lizenzbezogene ExtPay-Schlüssel in Browser-Storage.
- Keine Stripe-Secret-Keys im Extension-Code hinterlegen.

### Mindestmaßnahmen
- Keine sensiblen Daten in Klartext-Logs schreiben.
- Beim Support nur notwendige Daten erfassen.
- Nach Änderungen am Payment-Flow immer Regressionstest fahren.

## 9. Referenzen (offiziell)

- ExtensionPay Website: [https://extensionpay.com/](https://extensionpay.com/)
- ExtensionPay Stripe-Tutorial: [https://extensionpay.com/articles/add-stripe-payments-to-chrome-extensions/](https://extensionpay.com/articles/add-stripe-payments-to-chrome-extensions/)
- ExtPay-Dokumentation (GitHub): [https://github.com/Glench/ExtPay](https://github.com/Glench/ExtPay)
- Stripe Testing Environments: [https://docs.stripe.com/testing-use-cases](https://docs.stripe.com/testing-use-cases)
- Stripe Account Activation: [https://docs.stripe.com/get-started/account/activate](https://docs.stripe.com/get-started/account/activate)
