import type { Match } from './types';

export const ELO_START = 1500;
export const ELO_K = 32;

export interface EloChange {
  before: number;
  after: number;
  delta: number;
}

export interface EloEntry {
  match: Match;
  changes: Map<string, EloChange>;
}

export interface EloTimeline {
  entries: EloEntry[];
  /** Stand nach dem letzten Match */
  ratings: Map<string, number>;
}

/**
 * Individuelle ELO: Jeder Spieler wird gegen den Durchschnitt der gegnerischen
 * ELO gewertet (Sieg 1, Unentschieden 0,5, Niederlage 0). Alle Änderungen eines
 * Matches werden aus dem Stand *vor* dem Match berechnet.
 *
 * Welche Matches eine Rangliste bilden (alle / 2v2 / 3v3 / …), entscheidet der Aufrufer.
 */
export function computeElo(matches: Match[], { resetEachSeason }: { resetEachSeason: boolean }): EloTimeline {
  let ratings = new Map<string, number>();
  let season: number | null = null;
  const entries: EloEntry[] = [];

  for (const match of matches) {
    if (resetEachSeason && match.season !== season) ratings = new Map();
    season = match.season;

    const rating = (name: string) => ratings.get(name) ?? ELO_START;
    const teamAverage = (team: number) => {
      const members = match.players.filter((p) => p.team === team);
      return members.reduce((sum, p) => sum + rating(p.name), 0) / members.length;
    };
    const opponentAverage = [teamAverage(1), teamAverage(0)];

    const changes = new Map<string, EloChange>();
    for (const player of match.players) {
      const before = rating(player.name);
      const expected = 1 / (1 + 10 ** ((opponentAverage[player.team] - before) / 400));
      const actual = match.winner === null ? 0.5 : match.winner === player.team ? 1 : 0;
      const delta = Math.round(ELO_K * (actual - expected));
      changes.set(player.name, { before, after: before + delta, delta });
    }
    changes.forEach((change, name) => ratings.set(name, change.after));
    entries.push({ match, changes });
  }
  return { entries, ratings };
}

export interface PlayerEloSummary {
  current: number;
  peak: number;
  lowest: number;
  /** Summe der Änderungen der letzten 10 Matches des Spielers */
  lastTen: number;
  games: number;
}

export function eloSummary(entries: EloEntry[], player: string): PlayerEloSummary | null {
  const changes = entries.flatMap((e) => e.changes.get(player) ?? []);
  if (!changes.length) return null;
  const values = changes.map((c) => c.after);
  return {
    current: values[values.length - 1],
    peak: Math.max(changes[0].before, ...values),
    lowest: Math.min(changes[0].before, ...values),
    lastTen: changes.slice(-10).reduce((sum, c) => sum + c.delta, 0),
    games: changes.length,
  };
}
