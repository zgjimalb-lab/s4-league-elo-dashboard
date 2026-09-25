#!/usr/bin/env python3
"""
Einmalige Migration: baut data/matches.json aus
  1. der alten Screenshot/GPT-Historie (data/legacy/sheet_raw_2025.json, Nov–Dez 2025) und
  2. allem, was die Xero API noch hergibt (eigene 200 Matches + je 25 pro Gruppenmitglied).

Sheet-Matches, die sich einem API-Match zuordnen lassen (gleiche Spieler, gleicher
Damage), werden durch die exakten API-Daten ersetzt und behalten ihr Datum und ihre
Season. Nicht zuordenbare Sheet-Matches bleiben mit den Sheet-Werten erhalten.

    python scripts/migrate_history.py [--cache DIR]
"""

from __future__ import annotations

import argparse
import json
from collections import OrderedDict
from datetime import datetime
from pathlib import Path

from matchstore import (
    ROOT, assign_dates, from_xero, is_group_match, load_players, merge_orders, save_matches,
)
from xero import XeroClient, load_env_file

LEGACY_FILE = ROOT / "data" / "legacy" / "sheet_raw_2025.json"
OVERRIDES_FILE = ROOT / "data" / "legacy" / "overrides.json"


# ---------------------------------------------------------------------------
# Sheet-Historie
# ---------------------------------------------------------------------------

def to_int(value) -> int:
    try:
        return int(round(float(str(value).replace(",", ""))))
    except (TypeError, ValueError):
        return 0


def legacy_matches(aliases: dict[str, str], overrides: dict) -> list[dict]:
    rows = json.loads(LEGACY_FILE.read_text(encoding="utf-8"))
    alias_lookup = {k.casefold(): v for k, v in aliases.items()}
    grouped: "OrderedDict[str, list[dict]]" = OrderedDict()
    for row in rows:
        grouped.setdefault(row["match_id"], []).append(row)

    matches = []
    for match_id, match_rows in grouped.items():
        first = match_rows[0]
        players = []
        for row in match_rows:
            name = row["player_name"].strip()
            players.append({
                "name": alias_lookup.get(name.casefold(), name),
                "team": 0 if row["team_name"] == "red" else 1,
                "playtime": None,
                "goals": to_int(row.get("goals")),
                "assists": to_int(row.get("assists")),
                "damage": to_int(row.get("damage")),
                "score": to_int(row.get("score")),
            })
        goals = [sum(p["goals"] for p in players if p["team"] == t) for t in (0, 1)]
        points = [sum(p["score"] for p in players if p["team"] == t) for t in (0, 1)]
        # Sieger: mehr Touchdowns, bei Gleichstand mehr Team-Punkte
        winner = 0 if (goals[0], points[0]) > (goals[1], points[1]) else 1 if (goals[0], points[0]) < (goals[1], points[1]) else None
        match = {
            "id": match_id,
            "source": "sheet",
            "date": datetime.strptime(first["date"], "%d.%m.%Y").date().isoformat(),
            "legacySeason": to_int(first["season"].split()[-1]),
            "map": None,
            "durationSec": to_int(first.get("match_duration_seconds")) or None,
            "score": goals,
            "winner": winner,
            "players": players,
        }
        match.update(overrides.get(match_id, {}).get("set", {}))
        matches.append(match)
    return matches


# ---------------------------------------------------------------------------
# API-Abruf (optional mit Cache, damit man die Migration wiederholen kann)
# ---------------------------------------------------------------------------

def fetch_api(cache: Path | None, group: list[str]) -> dict[str, list[dict]]:
    if cache and (cache / "api.json").exists():
        return json.loads((cache / "api.json").read_text(encoding="utf-8"))
    client = XeroClient.from_env()
    lists = {"self": client.own_matches(limit=100, skip=0) + client.own_matches(limit=100, skip=100)}
    for name in group:
        lists[name] = client.player_matches(name)
    if cache:
        cache.mkdir(parents=True, exist_ok=True)
        (cache / "api.json").write_text(json.dumps(lists), encoding="utf-8")
    return lists


def same_match(legacy: dict, api: dict) -> bool:
    """Gleiche Spieler mit gleichem Damage – höchstens ein Spieler darf abweichen (GPT-Lesefehler)."""
    a = {(p["name"], p["damage"]) for p in legacy["players"]}
    b = {(p["name"], p["damage"]) for p in api["players"]}
    return len(a) == len(b) and len(a & b) >= max(2, len(a) - 1)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--cache", type=Path, help="Verzeichnis für API-Antworten (wird wiederverwendet)")
    args = parser.parse_args()

    load_env_file(ROOT / ".env.local")
    players = load_players()
    group = players["group"]
    overrides = json.loads(OVERRIDES_FILE.read_text(encoding="utf-8")) if OVERRIDES_FILE.exists() else {}

    sheet = legacy_matches(players["aliases"], overrides)
    lists = fetch_api(args.cache, group)

    api: dict[str, dict] = {}
    chains: list[list[str]] = []
    for api_list in lists.values():
        ours = [m for m in api_list if is_group_match(m, set(group))]
        for m in ours:
            api.setdefault(m["uid"], from_xero(m))
        chains.append([m["uid"] for m in reversed(ours)])  # API: neueste zuerst

    # Sheet-Matches den API-Matches zuordnen
    replaced: dict[str, str] = {}
    for legacy in sheet:
        candidates = [a for a in api.values() if a["id"] not in replaced.values() and same_match(legacy, a)]
        if len(candidates) == 1:
            replaced[legacy["id"]] = candidates[0]["id"]
            candidates[0].update(date=legacy["date"], legacySeason=legacy["legacySeason"], legacyId=legacy["id"])

    by_id = {**api, **{m["id"]: m for m in sheet if m["id"] not in replaced}}
    sheet_chain = [replaced.get(m["id"], m["id"]) for m in sheet]
    # API-Reihenfolgen sind exakt und haben Vorrang; die Sheet-Reihenfolge füllt die Lücken
    order = merge_orders(chains + [sheet_chain], priority={i: n for n, i in enumerate(sheet_chain)})
    merged = [by_id[i] for i in order]

    # Alle API-Matches wurden vor dem Start des Syncs gespielt: kein Datum → Datum des Vorgängers (geschätzt)
    assign_dates(merged, today=None)
    save_matches(merged)

    from_api = sum(1 for m in merged if m["source"] == "xero")
    print(f"✓ {len(merged)} Matches gespeichert: {from_api} aus der API ({len(replaced)} davon ersetzen Sheet-Einträge), "
          f"{len(merged) - from_api} nur aus dem Sheet.")
    for m in merged:
        if m["source"] == "sheet" and len({p['team'] for p in m['players']}) == 2:
            goals = m["score"]
            if max(goals) < 10 and m.get("durationSec", 0) and m["durationSec"] < 1700:
                print(f"  ⚠ {m['date']} {m['id']}: Sheet-Match endet {goals[0]}:{goals[1]} ohne 10 Tore – evtl. Lesefehler")


if __name__ == "__main__":
    main()
