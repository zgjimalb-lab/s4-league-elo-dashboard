"""
Gemeinsame Logik für `data/matches.json` – die dauerhafte Match-Sammlung.

Die Xero API liefert nur die letzten ~200 eigenen bzw. 25 Matches pro Spieler
und kein Datum. Deshalb speichern wir jedes Gruppen-Match selbst, in
chronologischer Reihenfolge (die Reihenfolge ist für die ELO entscheidend).

Gespeichert werden alle Touchdown-Matches, in denen ausschließlich
Gruppenmitglieder spielen – auch 3v2 oder Matches mit Leavern. Welche davon
für die Statistik zählen, entscheidet das Dashboard (client/src/lib/s4/rules.ts),
damit sich die Regeln ohne erneuten Datenabruf ändern lassen.
"""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
PLAYERS_FILE = ROOT / "data" / "players.json"
MATCHES_FILE = ROOT / "data" / "matches.json"
TIMEZONE = ZoneInfo("Europe/Berlin")
TRACKED_MODE = "Touchdown"


def load_players() -> dict:
    return json.loads(PLAYERS_FILE.read_text(encoding="utf-8"))


def load_matches() -> list[dict]:
    if not MATCHES_FILE.exists():
        return []
    return json.loads(MATCHES_FILE.read_text(encoding="utf-8"))["matches"]


def save_matches(matches: list[dict]) -> None:
    # eine Zeile pro Match: kompakt, aber mit lesbaren Git-Diffs
    lines = ",\n".join("    " + json.dumps(m, ensure_ascii=False, separators=(",", ":")) for m in matches)
    MATCHES_FILE.write_text('{\n  "matches": [\n' + lines + "\n  ]\n}\n", encoding="utf-8")


def now_local() -> datetime:
    return datetime.now(TIMEZONE).replace(microsecond=0)


# ---------------------------------------------------------------------------
# Xero-Match → gespeichertes Format
# ---------------------------------------------------------------------------

def is_group_match(api_match: dict, group: set[str]) -> bool:
    players = api_match.get("players") or []
    return (
        api_match.get("mode", {}).get("name") == TRACKED_MODE
        and len(players) >= 2
        and all(p["name"] in group for p in players)
    )


def from_xero(api_match: dict) -> dict:
    """Wandelt ein Match der Xero API in unser Format. Team 0 = Alpha, Team 1 = Beta."""
    players = []
    for p in api_match["players"]:
        s = p["stats"]
        players.append({
            "name": p["name"],
            "team": 0 if p["team"]["id"] == 1 else 1,
            "won": bool(p["won"]),
            "playtime": p["playtime"],
            "goals": s["goal"],
            # "A" auf der Match-Seite = Touchdown-Assist; `assists` der API ist ein anderer Zähler
            "assists": s["goalAssist"],
            "damage": s["damageDealt"],
            "score": s["totalScore"],
            "kills": s["kills"],
            "deaths": s["deaths"],
            "killAssists": s["killAssists"],
            "suicides": s["suicides"],
            "damageReceived": s["damageReceived"],
            "healing": s["healingProvided"],
            "healingReceived": s["healingReceived"],
            "rebounds": s["rebound"],
            "offense": s["offense"],
            "offenseAssists": s["offenseAssist"],
            "defense": s["defense"],
            "defenseAssists": s["defenseAssist"],
            "apiAssists": s["assists"],
            "tags": p.get("tags") or [],
        })

    winners = {p["team"] for p in players if p["won"]}
    score = api_match.get("score") or {}
    return {
        "id": api_match["uid"],
        "source": "xero",
        "date": None,  # wird beim Einsortieren gesetzt
        "map": (api_match.get("map") or {}).get("name"),
        "durationSec": api_match.get("playtime"),
        "score": [score.get("alpha", 0), score.get("beta", 0)],
        "winner": winners.pop() if len(winners) == 1 else None,
        "players": [{k: v for k, v in p.items() if k != "won"} for p in players],
    }


# ---------------------------------------------------------------------------
# Reihenfolge: mehrere Teil-Reihenfolgen zu einer Chronologie zusammenführen
# ---------------------------------------------------------------------------

def merge_orders(chains: list[list[str]], priority: dict[str, float] | None = None) -> list[str]:
    """
    Topologische Sortierung über mehrere chronologische Ketten von Match-IDs.
    Frühere Ketten haben Vorrang: Eine Kante, die einen Widerspruch (Zyklus)
    erzeugen würde, wird verworfen. Bei freier Wahl entscheidet `priority`
    (kleiner = früher), sonst die Reihenfolge des ersten Auftretens.
    """
    successors: dict[str, set[str]] = defaultdict(set)
    first_seen: dict[str, int] = {}

    def reaches(start: str, target: str) -> bool:
        stack, seen = [start], set()
        while stack:
            node = stack.pop()
            if node == target:
                return True
            if node not in seen:
                seen.add(node)
                stack.extend(successors[node])
        return False

    for chain in chains:
        for node in chain:
            first_seen.setdefault(node, len(first_seen))
        for earlier, later in zip(chain, chain[1:]):
            if later not in successors[earlier] and not reaches(later, earlier):
                successors[earlier].add(later)

    indegree = {node: 0 for node in first_seen}
    for node in first_seen:
        for succ in successors[node]:
            indegree[succ] += 1

    priority = priority or {}
    rank = lambda node: (priority.get(node, float("inf")), first_seen[node])
    ready = sorted((n for n, d in indegree.items() if d == 0), key=rank)
    order = []
    while ready:
        node = ready.pop(0)
        order.append(node)
        for succ in successors[node]:
            indegree[succ] -= 1
            if indegree[succ] == 0:
                ready.append(succ)
        ready.sort(key=rank)
    return order


def assign_dates(ordered: list[dict], today: str) -> None:
    """
    Matches ohne Datum bekommen das Datum des vorherigen datierten Matches –
    außer sie liegen hinter dem letzten datierten Match: dann sind sie neu (heute).
    """
    dated = [m["date"] for m in ordered if m.get("date")]
    last_dated = max((i for i, m in enumerate(ordered) if m.get("date")), default=-1)
    previous = dated[0] if dated else None  # undatierte Matches ganz am Anfang: Datum des ersten datierten
    for i, match in enumerate(ordered):
        if match.get("date"):
            previous = match["date"]
        else:
            match["date"] = previous if i < last_dated else today
    # Daten dürfen nicht rückwärts laufen (Sheet-Daten waren teils nur der Verarbeitungstag)
    for earlier, later in zip(reversed(ordered[:-1]), reversed(ordered[1:])):
        earlier["date"] = min(earlier["date"], later["date"])
