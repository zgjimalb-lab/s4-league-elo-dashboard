# Project TODO

## Daten-Setup
- [x] Excel-Daten in JSON konvertieren
- [x] Datenstruktur für ELO-Verlauf aufbauen
- [x] Datenstruktur für Player Stats (All-Time, 2v2, 3v3, Seasons) aufbauen
- [x] Daten-Dateien im Projekt ablegen

## Dashboard-Grundstruktur
- [x] Tab-Navigation implementieren (ELO, Winrate, Damage, Goals, Score, DPS)
- [x] Layout und Styling für Dashboard
- [x] Responsive Design sicherstellen

## ELO Tab
- [x] Liniendiagramm für ELO-Entwicklung über Matches
- [x] Multi-Player-Auswahl implementieren
- [x] Filter für All-Time, 2v2, 3v3, Seasons
- [x] Statistik-Tabelle mit sortierbaren Spalten
- [x] Farbcodierung für verschiedene Spieler

## Winrate Tab
- [x] Balkendiagramm für Winrate-Vergleich
- [x] Multi-Player-Auswahl implementieren
- [x] Filter für All-Time, 2v2, 3v3, Seasons
- [x] Statistik-Tabelle mit sortierbaren Spalten
- [x] Prozentanzeige formatieren

## Damage Tab
- [x] Balkendiagramm für Average Damage Vergleich
- [x] Multi-Player-Auswahl implementieren
- [x] Filter für All-Time, 2v2, 3v3, Seasons
- [x] Statistik-Tabelle mit sortierbaren Spalten

## Goals Tab
- [x] Balkendiagramm für Average Goals Vergleich
- [x] Multi-Player-Auswahl implementieren
- [x] Filter für All-Time, 2v2, 3v3, Seasons
- [x] Statistik-Tabelle mit sortierbaren Spalten

## Score Tab
- [x] Balkendiagramm für Average Score Vergleich
- [x] Multi-Player-Auswahl implementieren
- [x] Filter für All-Time, 2v2, 3v3, Seasons
- [x] Statistik-Tabelle mit sortierbaren Spalten

## DPS Tab (versteckt)
- [x] Balkendiagramm für Average DPS vorbereiten
- [x] Tab standardmäßig ausblenden
- [x] Aktivierungsmöglichkeit für später vorbereiten

## Gemeinsame Funktionen
- [x] Spielerauswahl-Komponente (Checkboxen für alle Spieler)
- [x] Filter-Komponente (All-Time, 2v2, 3v3, By Season)
- [x] Wiederverwendbare Tabellen-Komponente
- [x] Wiederverwendbare Chart-Komponenten (Line, Bar)

## Styling & UX
- [x] Konsistentes Farbschema für alle Tabs
- [x] Hover-Effekte und Tooltips
- [x] Loading States
- [x] Responsive Breakpoints testen

## Deployment-Vorbereitung
- [x] README mit Deployment-Anleitung erstellen
- [x] GitHub Repository Setup dokumentieren
- [x] Vercel Deployment Schritte dokumentieren
- [x] Anleitung für automatische Daten-Updates (Google Sheets + Make.com)
- [x] Excel-Konvertierungs-Script erstellen

## Bugfixes
- [x] Doppelte Keys in Tabellen beheben (Tess1509 kommt mehrfach vor)

## Design-Änderungen
- [x] Komplett auf Dark Mode umstellen
- [x] ELO-Kurve korrigieren - X-Achse nach Match-Nummern (nicht Zeilen, gleiche Match-ID = ein Match)

## Design-Verbesserungen
- [x] Dark Mode Farben anpassen (Kombination aus #131B2D und #1E293B)
- [x] Spielerauswahl mit Buttons statt Checkboxen
- [x] Tabellen-Layout optimieren (volle Breite, subtilere Grid-Linien)

## ELO-Chart-Optimierungen
- [x] Y-Achse dynamisch skalieren (min/max ELO + Puffer, nicht bei 0)
- [x] Spacing zwischen X-Achse und Legende vergrößern
- [x] Marker/Punkte entfernen (nur Linien anzeigen)
- [x] Rasterlinien dezenter gestalten (dünn, transparent)
- [x] Modernes, minimalistisches Design ohne visuelle Effekte

## Step-Chart und Datenkorrektur
- [x] ELO-Liniengrafik als Step-Chart implementieren (letzter ELO-Wert horizontal fortführen)
- [x] ELO-Änderung (10 Matches) aus Player_Stats_All_Time Sheet laden (ELO_change_10_matches)

## Forward-Fill und Tabellen-Sortierung
- [x] Forward-Fill-Logik für ELO-Chart implementieren (fehlende Werte mit letztem bekannten Wert auffüllen)
- [x] Step-Chart auf normale glatte Linien umstellen (monotone statt stepAfter)
- [x] Tabellen-Sortierung für ELO-Statistiken (Aktuelles ELO, Peak ELO, Änderung)

## Bugfix - toFixed Error
- [x] toFixed() Fehler in Tab-Komponenten beheben (undefined Werte abfangen)

## Bugfix - Winrate Duplikate und falsche Berechnung
- [x] Doppelte Spieler-Einträge in Winrate-Tabelle beheben
- [x] Winrate-Berechnung aus Match-Daten statt aggregierten Stats
- [x] Korrekte Season-Filterung für Winrate-Statistiken

## Bugfix - NaN in DamageTab Tooltip
- [x] NaN Werte in DamageTab und ScoreTab Tooltip beheben

## Bugfix - Season Filter zeigt Duplikate
- [x] Season-Filter korrigieren - Duplikate vermeiden
- [x] Prüfen wo Season-Daten gespeichert sind
- [x] WinrateTab auf aggregierte Stats umstellen (vermeidet Duplikate bei 2v2+3v3 Kombination)

## UI-Verbesserung - Tab-Reihenfolge
- [x] Tab-Reihenfolge ändern zu: ELO, Winrate, Score, Goals, Damage

## Deployment & Automatische Updates
- [x] GitHub Action für automatische Daten-Updates erstellen
- [x] Python Script für Google Sheets Download erstellen
- [x] DEPLOYMENT.md mit detaillierter Anleitung erstellen
- [x] QUICKSTART.md mit 15-Minuten-Anleitung erstellen
- [x] requirements.txt für Python Dependencies erstellen
- [x] .gitignore für Service Account Credentials aktualisieren
- [ ] GitHub Repository erstellen (User-Aktion)
- [ ] Vercel Deployment einrichten (User-Aktion)
- [ ] Google Sheets API Credentials konfigurieren (User-Aktion)

## Workflow-Optimierung - Google Sheets als Single Source of Truth
- [x] .gitignore aktualisieren - Excel-Dateien ignorieren
- [x] S4LeagueAutomatisierung.xlsx aus Repository entfernen
- [x] LOCAL_DEVELOPMENT.md erstellen
- [x] README.md aktualisieren mit Hinweis auf lokale Entwicklung

## ELO String Parsing Problem (ROOT CAUSE GEFUNDEN!)
- [x] ELO-Werte in data.json sind Strings mit Kommas ('1,516.00') statt Zahlen
- [x] usePlayerData Hook parst jetzt Strings zu Floats mit .replace(/,/g, '')
- [x] Alle Tab-Fixes + String-Parsing zu GitHub gepusht (Commit: 25f8e5bf)
- [ ] Vercel Deployment testen (warte auf Auto-Deploy)

## Verbleibende Bugs nach ELO-Fix
- [ ] Goals Tab: Schwarzer Bildschirm beim Klick auf Spieler
- [ ] Damage Tab: NaN-Werte werden angezeigt
- [ ] Ursache: Wahrscheinlich gleiche String-Parsing Probleme wie bei ELO
