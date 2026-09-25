# S4 League · Touchdown Stats

Dashboard für unsere S4-League-Runden (nur **Touchdown**): ELO, Rangliste, Spielerprofile,
Match-Historie, Head-to-Head und Duo-Synergien.

## So kommen die Daten rein

```
Xero API ──(stündlich, GitHub Action)──> data/matches.json ──(Commit)──> Vercel baut die Seite neu
```

- `scripts/sync_xero.py` fragt die [Xero API](https://xero.gg/settings/api/documentation) ab:
  die eigenen Matches des API-Keys (`/match/self`) und die letzten 25 Matches jedes
  Gruppenmitglieds (`/match/player/{name}`) – so fehlen auch Matches nicht, bei denen der
  Key-Besitzer nicht dabei war.
- Gespeichert werden alle **Touchdown-Matches, in denen nur Gruppenmitglieder spielen**.
  Die API hält nur die letzten ~200 Matches vor und liefert kein Datum – deshalb ist
  `data/matches.json` das dauerhafte Archiv (chronologisch, als Datum gilt der Tag, an dem
  der Sync das Match zuerst gesehen hat). Bei Altdaten aus der API ohne passenden Screenshot
  ist das Datum geschätzt (Datum des vorherigen Matches, auf der Seite als „ca.“ markiert).
- Die Historie von Nov./Dez. 2025 stammt aus der alten Screenshot-Auswertung
  (`data/legacy/`). Wo möglich wurde sie durch exakte API-Daten ersetzt
  (`scripts/migrate_history.py`, einmalig ausgeführt).

## Regeln

| Thema | Regel |
|---|---|
| Was zählt | Touchdown, gleich große Teams ab 2v2 (2v2, 3v3, 4v4, …), nur Gruppenmitglieder |
| Nachzügler & Leaver | Spieler unter 50 % Spielzeit werden für das Match nicht gewertet. Das Match zählt für die anderen, wenn danach gleich große Teams übrig bleiben |
| Sieger | Offizielles Ergebnis der API (alte Daten: mehr Touchdowns, bei Gleichstand mehr Punkte) |
| ELO | Start 1500, K = 32, jeder Spieler gegen den ELO-Schnitt des Gegnerteams. Eigene Wertungen für Gesamt und jede Teamgröße. Kein Reset – die ELO läuft über alle Seasons durch |
| Seasons | Neue Season nach mehr als 90 Tagen ohne Match (Nov./Dez. 2025 = Season 1). Der Season-Filter zeigt Statistiken und ELO-Verlauf dieses Zeitraums |
| Vorläufig | Unter 10 Spielen im gewählten Zeitraum |
| MVP | Höchster Score im Match |

Die Regeln stehen in `client/src/lib/s4/rules.ts` und `elo.ts` und sind getestet (`pnpm test`).

## KI-Spieleranalyse (nach jeder Season)

Jedes Spielerprofil zeigt eine Analyse mit Stärken, Schwächen, Entwicklung und Tipps –
erstellt mit Claude, jede Aussage mit Zahlen belegt.

1. `pnpm analysis:dossier` – rechnet alle Kennzahlen der letzten Season in
   `analysis/dossier-season-<N>.json` (gleiche Logik wie das Dashboard).
2. Claude bitten: „Erstelle die Spieleranalysen für Season N nach `analysis/PROMPT.md`.“
   Ergebnis: `data/analyses/season-<N>.json`.
3. Gegenlesen, committen – das Profil zeigt automatisch die neueste Analyse.

Der Prompt (`analysis/PROMPT.md`) enthält Spielkontext, Prüfregeln (Stichprobe, Modus-Mix,
Kausalität) und das Ausgabeformat. Analysiert werden Spieler ab 15 Spielen in der Season.

## Gruppe pflegen

`data/players.json`:

- `group` – wer mitgezählt wird. Neue Freunde hier eintragen, dann werden ihre Matches ab
  dem nächsten Sync erfasst. Die ersten 8 Namen bekommen feste Farben, alle weiteren sind grau.
- `aliases` – Schreibvarianten aus der alten Screenshot-Auswertung.

## Einrichtung

**GitHub Secrets** (Settings → Secrets and variables → Actions):

- `XERO_ACCESS_KEY_ID`
- `XERO_SECRET_ACCESS_KEY`

Den Key gibt es unter xero.gg → Settings → API → Access Keys. Der Workflow
„Sync Xero matches“ läuft stündlich und lässt sich unter *Actions* auch manuell starten.

**Nach langen Spielpausen:** GitHub pausiert geplante Workflows, wenn 60 Tage lang nichts im Repo
passiert ist. Dann unter *Actions → Sync Xero matches* auf „Enable workflow“ und einmal
„Run workflow“ klicken – danach läuft der Sync wieder stündlich.

**Vercel** baut automatisch bei jedem Push (Konfiguration in `vercel.json`).

## Lokal entwickeln

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # Regeln, ELO, Statistiken + Datenprüfung
pnpm check        # TypeScript

cp .env.example .env.local   # Xero-Key eintragen
pnpm sync                    # neue Matches holen
```

## Aufbau

```
data/
  matches.json         Match-Archiv (vom Sync geschrieben)
  players.json         Gruppe + Aliase
  legacy/              alte Screenshot-Daten (Nov./Dez. 2025)
scripts/
  sync_xero.py         stündlicher Sync
  xero.py              API-Client (mit Rate-Limit-Handling)
  matchstore.py        Umwandlung, Reihenfolge, Speichern
  migrate_history.py   einmalige Migration Sheet → API
client/src/
  lib/s4/              Regeln, ELO, Statistiken (reine Funktionen + Tests)
  pages/               Rangliste, ELO, Spieler, Matches, Head-to-Head, Duos
  components/          Layout, Diagramme, Match-Karte, Tabellen
```
