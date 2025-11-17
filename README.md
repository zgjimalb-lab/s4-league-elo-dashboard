# S4 League Player Statistics Dashboard

Ein interaktives Multi-Tab-Dashboard zur Analyse von Spielerdaten (ELO, Winrate, Damage, Goals, Score) mit Filtern für 2v2, 3v3 und All-Time Matches.

## Features

### Tabs
- **ELO**: Liniendiagramm zur Verfolgung der ELO-Entwicklung über Matches
- **Winrate**: Balkendiagramm zum Vergleich der Siegesraten
- **Damage**: Balkendiagramm für durchschnittlichen Damage pro Match
- **Goals**: Balkendiagramm für durchschnittliche Goals pro Match
- **Score**: Balkendiagramm für durchschnittlichen Score pro Match
- **DPS**: Versteckter Tab (kann später aktiviert werden)

### Funktionen
- **Multi-Player-Auswahl**: Wähle mehrere Spieler gleichzeitig aus
- **Filter**: All-Time, 2v2 Only, 3v3 Only, By Season (S1, S2)
- **Statistik-Tabellen**: Detaillierte Übersicht mit sortierbaren Daten
- **Responsive Design**: Funktioniert auf Desktop und Mobile
- **Farbcodierung**: Jeder Spieler hat eine eindeutige Farbe

## Datenstruktur

Die Daten werden aus der Excel-Datei `S4LeagueAutomatisierung.xlsx` in JSON konvertiert und in `client/public/data.json` gespeichert.

### Wichtige Sheets:
- `Player_Stats_All_Time`: Gesamtstatistiken
- `Player_Stats_All_Time_2v2`: 2v2 Statistiken
- `Player_Stats_All_Time_3v3`: 3v3 Statistiken
- `Player_Stats_S1_2v2`, `Player_Stats_S2_2v2`: Season-spezifische 2v2 Daten
- `Player_Stats_S1_3v3`, `Player_Stats_S2_3v3`: Season-spezifische 3v3 Daten
- `Elo_Player_All`: Match-by-Match ELO-Entwicklung

## Lokale Entwicklung

**Siehe [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md)** für eine detaillierte Anleitung.

### Schnellstart

```bash
# Dependencies installieren
pnpm install

# Google Sheets manuell als Excel exportieren
# Speichere als: S4LeagueAutomatisierung.xlsx

# Excel zu JSON konvertieren
python3.11 convert_excel.py

# Dev Server starten
pnpm dev
```

**Wichtig:** Die Excel-Datei wird NICHT ins Repository committed (nur `data.json`)

## Deployment

### 🚀 Schnellstart (15 Minuten)

**Siehe [QUICKSTART.md](QUICKSTART.md)** für eine kompakte Schritt-für-Schritt-Anleitung.

### 📚 Detaillierte Anleitung

**Siehe [DEPLOYMENT.md](DEPLOYMENT.md)** für eine vollständige Anleitung mit Troubleshooting.

### Übersicht

1. **Google Cloud Setup**: Service Account erstellen und Google Sheets freigeben
2. **GitHub Repository**: Projekt zu GitHub pushen und Secrets konfigurieren
3. **Vercel Deployment**: Projekt mit Vercel verbinden und deployen
4. **Automatische Updates**: GitHub Action läuft alle 10 Minuten und aktualisiert die Daten

### Automatische Daten-Updates

Die GitHub Action (`.github/workflows/update-data.yml`) lädt automatisch:
- Neueste Daten aus Google Sheets (via Service Account)
- Konvertiert zu JSON mit `convert_excel.py`
- Committed Änderungen ins Repository
- Vercel deployed automatisch die neue Version

**Zeitplan**: Alle 10 Minuten (anpassbar in der Workflow-Datei)

## Datenkonvertierung

Das Python-Script `convert_excel.py` konvertiert die Excel-Datei:

```python
import openpyxl
import json

wb = openpyxl.load_workbook('S4LeagueAutomatisierung.xlsx', data_only=True)
data = {}

for sheet_name in wb.sheetnames:
    ws = wb[sheet_name]
    sheet_data = []
    
    headers = [cell.value for cell in ws[1]]
    
    for row in ws.iter_rows(min_row=2, values_only=True):
        row_dict = {}
        for i, value in enumerate(row):
            if i < len(headers) and headers[i] and value is not None:
                row_dict[headers[i]] = value
        if any(row_dict.values()):
            sheet_data.append(row_dict)
    
    data[sheet_name] = sheet_data

with open('client/public/data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False, default=str)
```

## Technologie-Stack

- **Frontend**: React + TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **UI Components**: Radix UI + shadcn/ui
- **Build Tool**: Vite
- **Deployment**: Vercel

## Projektstruktur

```
player-stats-dashboard/
├── client/
│   ├── public/
│   │   └── data.json          # Konvertierte Spielerdaten
│   └── src/
│       ├── components/
│       │   ├── dashboard/     # Dashboard-Komponenten
│       │   │   ├── EloTab.tsx
│       │   │   ├── WinrateTab.tsx
│       │   │   ├── DamageTab.tsx
│       │   │   ├── GoalsTab.tsx
│       │   │   ├── ScoreTab.tsx
│       │   │   ├── DpsTab.tsx
│       │   │   ├── FilterControls.tsx
│       │   │   └── PlayerSelector.tsx
│       │   └── ui/            # UI-Komponenten (shadcn)
│       ├── hooks/
│       │   └── usePlayerData.ts
│       ├── pages/
│       │   └── Dashboard.tsx
│       └── App.tsx
├── convert_excel.py           # Excel → JSON Konverter
└── README.md
```

## Spieler-Farbcodierung

Jeder Spieler hat eine eindeutige Farbe für bessere Unterscheidbarkeit:

- **Aferdita**: Violett (#8b5cf6)
- **Anbuu**: Blau (#3b82f6)
- **Kesny**: Grün (#10b981)
- **Malena**: Orange (#f59e0b)
- **Nebus.**: Rot (#ef4444)
- **Tess1509**: Pink (#ec4899)
- **Troniix**: Türkis (#14b8a6)
- **ZeroO**: Indigo (#6366f1)

## Lizenz

MIT
