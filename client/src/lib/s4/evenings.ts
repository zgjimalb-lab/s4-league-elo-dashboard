import type { EloEntry } from './elo';
import type { Match } from './types';

/** Matches, die der Sync bis zu dieser Uhrzeit sieht, zählen noch zum Abend davor. */
const NIGHT_UNTIL_HOUR = 6;

/**
 * Ab hier startet cron-job.org den Sync alle 30 Minuten (Ortszeit). Davor lief er per GitHub-Zeitplan
 * oft nur alle 3–6 Stunden – der Sync-Zeitpunkt sagt dort nichts über die Uhrzeit des Matches.
 */
const RELIABLE_SYNC_SINCE = '2026-10-03T02:00:00';

/** Spielabend eines Matches (YYYY-MM-DD). Ohne Sync-Zeitpunkt (alte Matches) ist es das Match-Datum. */
export function eveningOf(match: Match): string {
  if (!match.seenAt) return match.date;
  // Ortszeit aus dem ISO-String, als UTC gelesen – so rechnet die Zeitzone des Browsers nicht mit
  const local = new Date(`${match.seenAt.slice(0, 19)}Z`);
  local.setUTCHours(local.getUTCHours() - NIGHT_UNTIL_HOUR);
  return local.toISOString().slice(0, 10);
}

/** Uhrzeit (HH:MM, Ortszeit), zu der der Sync das Match erfasst hat – nur, wenn der Sync dicht genug lief. */
export function syncTimeOf(match: Match): string | null {
  const local = match.seenAt?.slice(0, 19);
  return local && local >= RELIABLE_SYNC_SINCE ? local.slice(11, 16) : null;
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
