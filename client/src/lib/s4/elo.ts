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
  /** Siegchance laut ELO vor dem Match: Team 0 und Team 1 (Team-Schnitt gegen Team-Schnitt) */
  chance: [number, number];
}

/** Unter dieser Siegchance gilt ein Sieg als Überraschung. */
export const UPSET_CHANCE = 0.35;

const expectedScore = (own: number, opponent: number) => 1 / (1 + 10 ** ((opponent - own) / 400));

export interface EloTimeline {
  entries: EloEntry[];
  /** Stand nach dem letzten Match */
  ratings: Map<string, number>;
}

/**
 * Individuelle ELO: Jeder Spieler wird gegen den Durchschnitt der gegnerischen
 * ELO gewertet (Sieg 1, Unentschieden 0,5, Niederlage 0). Alle Änderungen eines
 * Matches werden aus dem Stand *vor* dem Match berechnet. Die ELO läuft über
 * alle Seasons durch (kein Reset).
 *
 * Welche Matches eine Rangliste bilden (alle / 2v2 / 3v3 / …), entscheidet der Aufrufer.
 */
export function computeElo(matches: Match[]): EloTimeline {
  const ratings = new Map<string, number>();
  const entries: EloEntry[] = [];

  for (const match of matches) {
    const rating = (name: string) => ratings.get(name) ?? ELO_START;
    const teamAverage = (team: number) => {
      const members = match.players.filter((p) => p.team === team);
      return members.reduce((sum, p) => sum + rating(p.name), 0) / members.length;
    };
    const average = [teamAverage(0), teamAverage(1)];
    const opponentAverage = [average[1], average[0]];
    const chanceTeam0 = expectedScore(average[0], average[1]);

    const changes = new Map<string, EloChange>();
    for (const player of match.players) {
      const before = rating(player.name);
      const expected = expectedScore(before, opponentAverage[player.team]);
      const actual = match.winner === null ? 0.5 : match.winner === player.team ? 1 : 0;
      const delta = Math.round(ELO_K * (actual - expected));
      changes.set(player.name, { before, after: before + delta, delta });
    }
    changes.forEach((change, name) => ratings.set(name, change.after));
    entries.push({ match, changes, chance: [chanceTeam0, 1 - chanceTeam0] });
  }
  return { entries, ratings };
}

/** Siegchance des Teams, das gewonnen hat (null bei Unentschieden). */
export const winnerChance = (entry: EloEntry) => (entry.match.winner === null ? null : entry.chance[entry.match.winner]);

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
