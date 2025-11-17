# Deployment-Anleitung: S4 League Player Statistics Dashboard

Diese Anleitung führt dich Schritt für Schritt durch die Veröffentlichung deines Dashboards mit automatischen Daten-Updates aus Google Sheets.

## Voraussetzungen

- GitHub Account
- Vercel Account (kostenlos)
- Google Cloud Account (kostenlos)
- Deine Google Sheets Datei

---

## Teil 1: Google Cloud Setup (Service Account erstellen)

### 1.1 Google Cloud Projekt erstellen

1. Gehe zu [Google Cloud Console](https://console.cloud.google.com/)
2. Klicke auf **"Neues Projekt erstellen"**
3. Name: `S4-League-Stats` (oder beliebig)
4. Klicke auf **"Erstellen"**

### 1.2 Google Sheets API aktivieren

1. Im Google Cloud Projekt → **"APIs & Dienste"** → **"Bibliothek"**
2. Suche nach **"Google Sheets API"**
3. Klicke auf **"Aktivieren"**
4. Wiederhole für **"Google Drive API"**

### 1.3 Service Account erstellen

1. **"APIs & Dienste"** → **"Anmeldedaten"**
2. Klicke auf **"Anmeldedaten erstellen"** → **"Dienstkonto"**
3. Name: `github-actions-sheets`
4. Klicke auf **"Erstellen und fortfahren"**
5. Rolle: **"Betrachter"** (Viewer)
6. Klicke auf **"Fertig"**

### 1.4 Service Account Key herunterladen

1. Klicke auf das erstellte Service Account
2. Tab **"Schlüssel"** → **"Schlüssel hinzufügen"** → **"Neuen Schlüssel erstellen"**
3. Typ: **JSON**
4. Klicke auf **"Erstellen"**
5. **Speichere die heruntergeladene JSON-Datei sicher!**

### 1.5 Google Sheets freigeben

1. Öffne deine Google Sheets Datei
2. Klicke auf **"Freigeben"**
3. Kopiere die **E-Mail-Adresse** aus dem Service Account JSON (z.B. `github-actions-sheets@...iam.gserviceaccount.com`)
4. Füge diese E-Mail als **"Betrachter"** hinzu
5. Klicke auf **"Senden"**

### 1.6 Google Sheets ID notieren

Die Sheets ID findest du in der URL:
```
https://docs.google.com/spreadsheets/d/HIER_IST_DIE_ID/edit
```
Kopiere diese ID (z.B. `1a2b3c4d5e6f7g8h9i0j`)

---

## Teil 2: GitHub Repository erstellen

### 2.1 Repository erstellen

1. Gehe zu [GitHub](https://github.com/)
2. Klicke auf **"New Repository"**
3. Name: `s4-league-player-stats` (oder beliebig)
4. Visibility: **Public** oder **Private**
5. Klicke auf **"Create repository"**

### 2.2 Projekt zu GitHub pushen

Öffne ein Terminal im Projektverzeichnis und führe aus:

```bash
# Git initialisieren (falls noch nicht geschehen)
git init

# Remote hinzufügen (ersetze USERNAME und REPO_NAME)
git remote add origin https://github.com/USERNAME/REPO_NAME.git

# Alle Dateien hinzufügen
git add .

# Commit erstellen
git commit -m "Initial commit: S4 League Player Stats Dashboard"

# Zu GitHub pushen
git branch -M main
git push -u origin main
```

### 2.3 GitHub Secrets konfigurieren

1. Gehe zu deinem GitHub Repository
2. **"Settings"** → **"Secrets and variables"** → **"Actions"**
3. Klicke auf **"New repository secret"**

**Secret 1: GOOGLE_SHEETS_ID**
- Name: `GOOGLE_SHEETS_ID`
- Value: Deine Google Sheets ID (aus Schritt 1.6)

**Secret 2: GOOGLE_SERVICE_ACCOUNT_JSON**
- Name: `GOOGLE_SERVICE_ACCOUNT_JSON`
- Value: Kompletter Inhalt der heruntergeladenen JSON-Datei (aus Schritt 1.4)
  ```json
  {
    "type": "service_account",
    "project_id": "...",
    "private_key_id": "...",
    ...
  }
  ```

---

## Teil 3: Vercel Deployment

### 3.1 Vercel Account erstellen

1. Gehe zu [Vercel](https://vercel.com/)
2. Klicke auf **"Sign Up"**
3. Wähle **"Continue with GitHub"**

### 3.2 Projekt importieren

1. Im Vercel Dashboard → **"Add New..."** → **"Project"**
2. Wähle dein GitHub Repository aus
3. **Framework Preset**: Vite
4. **Root Directory**: `.` (leer lassen)
5. **Build Command**: `pnpm build`
6. **Output Directory**: `client/dist`

### 3.3 Environment Variables (optional)

Falls du später Secrets für das Frontend brauchst:
1. **"Environment Variables"** Tab
2. Füge Variablen hinzu (aktuell nicht nötig)

### 3.4 Deploy

1. Klicke auf **"Deploy"**
2. Warte 2-3 Minuten
3. Deine Website ist live! 🎉

---

## Teil 4: Automatische Updates testen

### 4.1 Manueller Test

1. Gehe zu deinem GitHub Repository
2. **"Actions"** Tab
3. Wähle **"Update Player Stats Data"**
4. Klicke auf **"Run workflow"** → **"Run workflow"**
5. Warte bis der Workflow abgeschlossen ist (grüner Haken)

### 4.2 Automatische Updates

Die GitHub Action läuft jetzt **alle 10 Minuten** automatisch:
- Lädt die neuesten Daten aus Google Sheets
- Konvertiert sie zu JSON
- Committed die Änderungen
- Vercel deployed automatisch die neue Version

### 4.3 Zeitplan anpassen (optional)

Öffne `.github/workflows/update-data.yml` und ändere die Zeile:

```yaml
schedule:
  - cron: '*/10 * * * *'  # Alle 10 Minuten
```

Beispiele:
- `'0 * * * *'` - Jede Stunde
- `'*/30 * * * *'` - Alle 30 Minuten
- `'0 */6 * * *'` - Alle 6 Stunden

---

## Teil 5: Troubleshooting

### Problem: GitHub Action schlägt fehl

**Fehler: "GOOGLE_SHEETS_ID not set"**
- Prüfe ob die Secrets korrekt in GitHub eingetragen sind
- Secrets sind case-sensitive!

**Fehler: "Permission denied"**
- Prüfe ob das Service Account die Google Sheets Datei freigegeben bekommen hat
- Prüfe ob Google Sheets API und Drive API aktiviert sind

**Fehler: "Module not found"**
- Die GitHub Action installiert automatisch alle Dependencies
- Prüfe ob `scripts/download_sheets.py` korrekt committed wurde

### Problem: Vercel Build schlägt fehl

**Fehler: "Command not found: pnpm"**
- Vercel sollte pnpm automatisch erkennen
- Falls nicht: Ändere Build Command zu `npm install && npm run build`

**Fehler: "Cannot find module"**
- Prüfe ob `package.json` korrekt committed wurde
- Prüfe ob alle Dependencies in `package.json` aufgelistet sind

### Problem: Daten werden nicht aktualisiert

**Website zeigt alte Daten**
- Warte 2-3 Minuten nach dem GitHub Commit (Vercel Build Zeit)
- Lösche Browser Cache (Strg+Shift+R / Cmd+Shift+R)
- Prüfe ob `data.json` im Repository aktualisiert wurde

---

## Teil 6: Nächste Schritte

### Custom Domain (optional)

1. Vercel Dashboard → Dein Projekt → **"Settings"** → **"Domains"**
2. Füge deine Domain hinzu (z.B. `stats.s4league.com`)
3. Folge den DNS-Anweisungen

### Monitoring

- **GitHub Actions**: Prüfe regelmäßig den Actions Tab auf Fehler
- **Vercel Analytics**: Aktiviere in den Projekt-Settings für Besucherstatistiken

### Optimierungen

- **Caching**: Vercel cached automatisch statische Assets
- **CDN**: Vercel verwendet automatisch ein globales CDN
- **HTTPS**: Automatisch aktiviert

---

## Support

Bei Problemen:
1. Prüfe die GitHub Actions Logs
2. Prüfe die Vercel Deployment Logs
3. Öffne ein Issue im Repository

**Viel Erfolg mit deinem Dashboard! 🚀**
