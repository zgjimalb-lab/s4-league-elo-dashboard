import type { EloEntry } from './elo';
import type { Match } from './types';

/** Matches, die der Sync bis zu dieser Uhrzeit sieht, zählen noch zum Abend davor. */
const NIGHT_UNTIL_HOUR = 6;

/** Spielabend eines Matches (YYYY-MM-DD). Ohne Sync-Zeitpunkt (alte Matches) ist es das Match-Datum. */
export function eveningOf(match: Match): string {
  if (!match.seenAt) return match.date;
  // Ortszeit aus dem ISO-String, als UTC gelesen – so rechnet die Zeitzone des Browsers nicht mit
  const local = new Date(`${match.seenAt.slice(0, 19)}Z`);
  local.setUTCHours(local.getUTCHours() - NIGHT_UNTIL_HOUR);
  return local.toISOString().slice(0, 10);
}

export interface Evening {
  date: string;
  /** chronologisch */
  matches: Match[];
  /** enthält Matches, deren Datum nur geschätzt ist */
  estimated: boolean;
}

/** Matches nach Spielabend gruppiert, neuester Abend zuerst. */
export function groupEvenings(matches: Match[]): Evening[] {
  const byDate = new Map<string, Match[]>();
  for (const match of matches) {
    const date = eveningOf(match);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(match);
  }
  return Array.from(byDate, ([date, list]) => ({ date, matches: list, estimated: list.some((m) => m.dateEstimated) })).sort(
    (a, b) => b.date.localeCompare(a.date),
  );
}

/** Summe der ELO-Änderungen pro Spieler über die angegebenen Matches. */
export function eloDeltas(matches: Match[], entries: EloEntry[]): Map<string, number> {
  const ids = new Set(matches.map((m) => m.id));
  const deltas = new Map<string, number>();
  for (const entry of entries) {
    if (!ids.has(entry.match.id)) continue;
    entry.changes.forEach((change, name) => deltas.set(name, (deltas.get(name) ?? 0) + change.delta));
  }
  return deltas;
}
