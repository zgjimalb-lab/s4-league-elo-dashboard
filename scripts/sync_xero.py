#!/usr/bin/env python3
"""
Holt neue Gruppen-Matches von der Xero API und hängt sie an data/matches.json an.

Abgefragt werden die eigenen Matches des API-Keys (/match/self) und die letzten
25 Matches jedes Gruppenmitglieds (/match/player/{name}) – so landen auch Matches
im Archiv, bei denen der Key-Besitzer nicht mitgespielt hat.

    python scripts/sync_xero.py          # Zugangsdaten aus Umgebung oder .env.local
"""

from __future__ import annotations

import sys

from datetime import timedelta

from matchstore import (
    ROOT, assign_dates, from_xero, is_group_match, load_matches, load_players,
    merge_orders, now_local, save_matches,
)
from xero import XeroClient, load_env_file


def main() -> int:
    load_env_file(ROOT / ".env.local")
    client = XeroClient.from_env()
    group = set(load_players()["group"])
    stored = load_matches()
    known_ids = {m["id"] for m in stored}

    # jede API-Liste ist eine chronologische Teil-Reihenfolge (API liefert neueste zuerst)
    chains: list[list[str]] = [[m["id"] for m in stored]]
    fetched: dict[str, dict] = {}
    sources = [("eigene Matches", client.own_matches)] + [
        (name, lambda name=name: client.player_matches(name)) for name in sorted(group)
    ]
    failures = 0
    for label, fetch in sources:
        try:
            api_matches = [m for m in fetch() if is_group_match(m, group)]
        except RuntimeError as error:
            failures += 1
            print(f"  ⚠ {label}: {error}")
            continue
        for match in api_matches:
            fetched.setdefault(match["uid"], match)
        chains.append([m["uid"] for m in reversed(api_matches)])

    if failures == len(sources):
        print("Keine Quelle erreichbar.")
        return 1

    new_ids = [uid for uid in fetched if uid not in known_ids]
    if not new_ids:
        print(f"Keine neuen Matches ({len(stored)} gespeichert).")
        return 0

    now = now_local()
    by_id = {m["id"]: m for m in stored}
    for uid in new_ids:
        by_id[uid] = {**from_xero(fetched[uid]), "seenAt": now.isoformat()}

    order = merge_orders(chains, priority={m["id"]: i for i, m in enumerate(stored)})
    merged = [by_id[uid] for uid in order]
    # Ein Match ist beim Sync bis zu einer Stunde alt – kurz nach Mitternacht gehört es noch zum Vortag
    assign_dates(merged, (now - timedelta(hours=1)).date().isoformat())
    save_matches(merged)

    print(f"✓ {len(new_ids)} neue Matches ({len(merged)} gespeichert):")
    for uid in new_ids:
        m = by_id[uid]
        print(f"  {m['date']}  {uid}  {m['score'][0]}:{m['score'][1]}  {', '.join(p['name'] for p in m['players'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
