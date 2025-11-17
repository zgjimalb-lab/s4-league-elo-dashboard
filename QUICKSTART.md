# Quick Start Guide - Deployment in 15 Minuten

Folge diesen Schritten für ein schnelles Deployment:

## 1. Google Cloud Setup (5 Minuten)

1. **Google Cloud Console öffnen**: https://console.cloud.google.com/
2. **Neues Projekt erstellen**: `S4-League-Stats`
3. **APIs aktivieren**:
   - Google Sheets API
   - Google Drive API
4. **Service Account erstellen**:
   - Name: `github-actions-sheets`
   - Rolle: Betrachter
   - JSON Key herunterladen
5. **Google Sheets freigeben**:
   - Service Account E-Mail als Betrachter hinzufügen
   - Sheets ID aus URL kopieren

## 2. GitHub Repository (3 Minuten)

```bash
# Repository erstellen auf GitHub.com
# Dann im Terminal:

git init
git remote add origin https://github.com/DEIN_USERNAME/DEIN_REPO.git
git add .
git commit -m "Initial commit"
git branch -M main
git push -u origin main
```

## 3. GitHub Secrets (2 Minuten)

Repository → Settings → Secrets → Actions → New secret

1. **GOOGLE_SHEETS_ID**: `Deine_Sheets_ID_hier`
2. **GOOGLE_SERVICE_ACCOUNT_JSON**: `{kompletter JSON Inhalt}`

## 4. Vercel Deployment (3 Minuten)

1. **Vercel.com öffnen** und mit GitHub anmelden
2. **Projekt importieren**: Dein Repository auswählen
3. **Settings**:
   - Framework: Vite
   - Build Command: `pnpm build`
   - Output Directory: `client/dist`
4. **Deploy klicken** → Fertig! 🎉

## 5. Testen (2 Minuten)

1. GitHub → Actions → "Update Player Stats Data" → Run workflow
2. Warte 2-3 Minuten
3. Öffne deine Vercel URL → Daten sollten aktualisiert sein

---

## Automatische Updates

Die GitHub Action läuft jetzt **alle 10 Minuten** automatisch.

Zeitplan ändern in `.github/workflows/update-data.yml`:
```yaml
schedule:
  - cron: '*/10 * * * *'  # Alle 10 Minuten
  - cron: '0 * * * *'     # Jede Stunde
  - cron: '0 */6 * * *'   # Alle 6 Stunden
```

---

## Fertig!

Deine Website ist jetzt live und aktualisiert sich automatisch! 🚀

**Detaillierte Anleitung**: Siehe `DEPLOYMENT.md`
