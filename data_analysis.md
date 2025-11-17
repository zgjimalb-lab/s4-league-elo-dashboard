# Datenstruktur-Analyse für Player Stats Dashboard

## Excel Sheets Übersicht

### Player Stats Sheets
1. **Player_Stats_All_Time** - Gesamtstatistiken aller Spieler
2. **Player_Stats_All_Time_2v2** - 2v2 Statistiken
3. **Player_Stats_All_Time_3v3** - 3v3 Statistiken
4. **Player_Stats_S1_2v2** - Season 1, 2v2
5. **Player_Stats_S2_2v2** - Season 2, 2v2
6. **Player_Stats_S1_3v3** - Season 1, 3v3
7. **Player_Stats_S2_3v3** - Season 2, 3v3

### ELO Sheet
- **Elo_Player_All** - 999 Zeilen mit Match-by-Match ELO Entwicklung
  - Spalten: match_id, date, player_name, team_key, opponent_team_key, match_result, team_size, opponent_1, opponent_2, opponent_3, opponent_1_elo, opponent_2_elo, opponent_3_elo, player_elo_before, opponent_average_elo, elo_change, player_elo_after

### Team Stats Sheets
- **Team_Stats_All_Time_2v2**
- **Team_Stats_All_Time_3v3**

### Raw Data
- **Raw** - 448 Zeilen Rohdaten

## Spieler Liste
- Aferdita
- Anbuu
- Kesny
- Malena
- Nebus.
- Tess1509
- Troniix
- ZeroO

## Metriken pro Tab

### 1. ELO Tab
- Datenquelle: Elo_Player_All
- Chart: Liniendiagramm (ELO über Match-IDs)
- Zeigt: player_elo_after über Zeit

### 2. Winrate Tab
- Datenquelle: Player_Stats_* (je nach Filter)
- Chart: Balkendiagramm (primär), optional Liniendiagramm
- Zeigt: winrate (Prozent)

### 3. Damage Tab
- Datenquelle: Player_Stats_* (je nach Filter)
- Chart: Balkendiagramm (primär), optional Liniendiagramm
- Zeigt: avg_damage (Durchschnitt pro Match)

### 4. Goals Tab
- Datenquelle: Player_Stats_* (je nach Filter)
- Chart: Balkendiagramm (primär), optional Liniendiagramm
- Zeigt: avg_goals (Durchschnitt pro Match)

### 5. Score Tab
- Datenquelle: Player_Stats_* (je nach Filter)
- Chart: Balkendiagramm (primär), optional Liniendiagramm
- Zeigt: avg_score (Durchschnitt pro Match)

### 6. DPS Tab (versteckt)
- Datenquelle: Player_Stats_* (je nach Filter)
- Chart: Balkendiagramm (primär), optional Liniendiagramm
- Zeigt: avg_dps
- Status: Vorbereitet aber nicht sichtbar

## Filter-Logik

### Modi
1. **All-Time** (Default) → Player_Stats_All_Time
2. **2v2 Only** → Player_Stats_All_Time_2v2
3. **3v3 Only** → Player_Stats_All_Time_3v3
4. **By Season** → Player_Stats_S1_2v2, Player_Stats_S2_2v2, etc.

## Technische Anforderungen

### Funktionen
- Multi-Player-Auswahl (mehrere Spieler gleichzeitig)
- Chart-Typ Umschaltung (Linien vs. Balken)
- Sortierbare Statistik-Tabelle
- Filter für Game-Modi und Seasons

### Deployment
- GitHub Repository
- Vercel Hosting
- Automatische Updates via Google Sheets + Make.com

### Datenformat
- Excel → JSON Konvertierung für Web
- Chronologische Sortierung nach Match-ID für ELO
