import json
from collections import defaultdict, OrderedDict

# Lade Daten
with open('/home/ubuntu/player-stats-dashboard/client/public/data.json') as f:
    d = json.load(f)

elo_records = d.get('Elo_Player_All', [])
if not elo_records:
    print('ERROR: Elo_Player_All not found or empty')
    print('Available keys:', list(d.keys()))
    exit(1)

# Gruppiere nach match_id und behalte die Reihenfolge
matches_ordered = []
seen_matches = set()

print(f'First record type: {type(elo_records[0])}')
print(f'First record keys: {list(elo_records[0].keys()) if isinstance(elo_records[0], dict) else "Not a dict"}')
print(f'First record: {elo_records[0]}')

for record in elo_records:
    if not isinstance(record, dict):
        print(f'ERROR: Record is not a dict: {type(record)}')
        continue
    match_id = record.get('match_id')
    if match_id not in seen_matches:
        seen_matches.add(match_id)
        matches_ordered.append(match_id)

# Gruppiere Spieler pro Match
matches_data = defaultdict(list)
for record in elo_records:
    if not isinstance(record, dict):
        continue
    match_id = record.get('match_id')
    if not match_id:
        continue
    matches_data[match_id].append({
        'player': record['player_name'],
        'elo_after': record['player_elo_after']
    })

print(f"Total ELO records: {len(elo_records)}")
print(f"Unique matches (chronologisch): {len(matches_ordered)}")
print(f"\nErste 5 Matches:")
for i, match_id in enumerate(matches_ordered[:5]):
    players_data = matches_data[match_id]
    players = [p['player'] for p in players_data]
    print(f"  Match {i+1} (ID: {match_id[:20]}...): {len(players)} Spieler - {players}")

print(f"\nLetzte 3 Matches:")
for i, match_id in enumerate(matches_ordered[-3:], start=len(matches_ordered)-2):
    players_data = matches_data[match_id]
    players = [p['player'] for p in players_data]
    print(f"  Match {i} (ID: {match_id[:20]}...): {len(players)} Spieler - {players}")
