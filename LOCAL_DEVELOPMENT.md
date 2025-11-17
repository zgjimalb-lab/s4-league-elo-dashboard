# Lokale Entwicklung - Anleitung

Diese Anleitung erklärt, wie du das Dashboard lokal entwickeln und testen kannst.

---

## Voraussetzungen

- Node.js 18+ und pnpm installiert
- Python 3.11+ installiert
- Zugriff auf die Google Sheets Datei

---

## Erstmaliges Setup

### 1. Repository klonen

```bash
git clone https://github.com/DEIN-USERNAME/DEIN-REPO.git
cd player-stats-dashboard
```

### 2. Dependencies installieren

```bash
# Node.js Dependencies
pnpm install

# Python Dependencies (optional, nur für Daten-Konvertierung)
pip install -r requirements.txt
```

### 3. Daten vorbereiten

**Option A: Google Sheets manuell exportieren (Empfohlen)**

1. Öffne deine Google Sheets Datei
2. **Datei** → **Herunterladen** → **Microsoft Excel (.xlsx)**
3. Speichere als `S4LeagueAutomatisierung.xlsx` im Projektverzeichnis
4. Konvertiere zu JSON:
   ```bash
   python3.11 convert_excel.py
   ```

**Option B: Vorhandene data.json verwenden**

Falls `client/public/data.json` bereits existiert (aus dem Repository):
- Keine weiteren Schritte nötig
- Daten sind möglicherweise veraltet

---

## Development Server starten

```bash
pnpm dev
```

Das Dashboard öffnet sich automatisch auf: http://localhost:3000

---

## Daten aktualisieren (während der Entwicklung)

### Wenn du Änderungen in Google Sheets gemacht hast:

1. **Exportiere Google Sheets als Excel**
   - Datei → Herunterladen → Microsoft Excel (.xlsx)
   - Speichere als `S4LeagueAutomatisierung.xlsx`

2. **Konvertiere zu JSON**
   ```bash
   python3.11 convert_excel.py
   ```

3. **Browser neu laden**
   - Der Dev Server erkennt die Änderung automatisch
   - Oder drücke `Strg+R` / `Cmd+R`

---

## Wichtige Hinweise

### ⚠️ Excel-Datei NICHT committen

Die `S4LeagueAutomatisierung.xlsx` ist in `.gitignore` und wird **nicht** ins Repository committed:

```bash
# Prüfen was committed wird
git status

# Du solltest NICHT sehen:
# ❌ S4LeagueAutomatisierung.xlsx

# Du solltest sehen:
# ✅ client/public/data.json (falls du sie manuell aktualisiert hast)
```

### ✅ Nur data.json committen (optional)

Falls du die Daten manuell aktualisiert hast und sie ins Repository pushen willst:

```bash
git add client/public/data.json
git commit -m "chore: update player stats data"
git push
```

**ABER:** In der Produktion werden die Daten automatisch von der GitHub Action aktualisiert!

---

## Projekt-Struktur

```
player-stats-dashboard/
├── client/
│   ├── public/
│   │   └── data.json              # ✅ Wird committed
│   └── src/                       # ✅ Wird committed
├── .github/workflows/
│   └── update-data.yml            # ✅ Wird committed
├── scripts/
│   └── download_sheets.py         # ✅ Wird committed
├── S4LeagueAutomatisierung.xlsx   # ❌ Wird NICHT committed (lokal)
├── convert_excel.py               # ✅ Wird committed
├── package.json                   # ✅ Wird committed
└── ...
```

---

## Häufige Probleme

### Problem: "Cannot find module"

**Lösung:**
```bash
pnpm install
```

### Problem: "data.json not found"

**Lösung:**
```bash
# Exportiere Google Sheets als Excel
# Dann:
python3.11 convert_excel.py
```

### Problem: "Python module not found"

**Lösung:**
```bash
pip install -r requirements.txt
```

### Problem: Daten werden nicht aktualisiert

**Lösung:**
1. Prüfe ob `client/public/data.json` aktualisiert wurde:
   ```bash
   ls -lh client/public/data.json
   ```
2. Hard Reload im Browser: `Strg+Shift+R` / `Cmd+Shift+R`
3. Lösche Browser Cache

---

## Build für Produktion

```bash
# Build erstellen
pnpm build

# Build testen (lokal)
pnpm preview
```

Die fertigen Dateien liegen in `client/dist/`

---

## Workflow-Zusammenfassung

### Lokale Entwicklung:
```
Google Sheets (manuell exportieren)
    ↓
S4LeagueAutomatisierung.xlsx (lokal)
    ↓
python convert_excel.py
    ↓
client/public/data.json
    ↓
pnpm dev (Development Server)
```

### Produktion (automatisch):
```
Google Sheets (Live-Daten)
    ↓
GitHub Action (alle 10 Min)
    ↓
Download via Service Account
    ↓
Konvertierung zu JSON
    ↓
Commit zu GitHub
    ↓
Vercel Deployment
```

---

## Nächste Schritte

- **Code ändern**: Bearbeite Dateien in `client/src/`
- **Komponenten hinzufügen**: Siehe `client/src/components/`
- **Styling anpassen**: Bearbeite `client/src/index.css`
- **Neue Features**: Siehe `todo.md` für offene Aufgaben

---

Bei Fragen oder Problemen: Siehe `README.md` oder `DEPLOYMENT.md`
