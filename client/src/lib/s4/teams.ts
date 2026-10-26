import { expectedScore } from './elo';
import { lineupStats, teamKey, type WinRecord } from './stats';
import type { Match } from './types';

export interface TeamChance {
  key: string;
  /** stärkster Spieler zuerst */
  players: string[];
  /** Ø Siegchance laut ELO gegen alle Teams, die die übrigen Spieler bilden können */
  chance: number;
  /** wie diese Aufstellung bisher abgeschnitten hat (null = nie zusammen gespielt) */
  record: WinRecord | null;
}

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  return items.flatMap((item, i) => combinations(items.slice(i + 1), size - 1).map((rest) => [item, ...rest]));
}

/**
 * Alle möglichen Teams der Größe `size` aus `pool`. Die Siegchance rechnet wie die ELO selbst
 * (Team-Schnitt gegen Team-Schnitt) und mittelt über alle möglichen Gegner-Teams aus den übrigen Spielern.
 * Die Bilanz kommt aus `matches` (nur Matches mit genau dieser Aufstellung zählen).
 */
export function teamChances(pool: string[], ratings: Map<string, number>, size: number, matches: Match[]): TeamChance[] {
  if (pool.length < size * 2) return [];
  const rating = (name: string) => ratings.get(name) ?? 1500;
  const average = (team: string[]) => team.reduce((sum, p) => sum + rating(p), 0) / team.length;
  const records = new Map(lineupStats(matches, []).map((l) => [l.key, l]));
  const sorted = [...pool].sort((a, b) => rating(b) - rating(a));

  return combinations(sorted, size)
    .map((team) => {
      const opponents = combinations(sorted.filter((p) => !team.includes(p)), size);
      const chance = opponents.reduce((sum, opp) => sum + expectedScore(average(team), average(opp)), 0) / opponents.length;
      const key = teamKey(team);
      return { key, players: team, chance, record: records.get(key) ?? null };
    })
    .sort((a, b) => b.chance - a.chance);
}
