import type { Match, PlayerLine } from './types';

/**
 * Rollen-Stats aus den Xero-Details (Offense, Defense, Rebounds, Kills …).
 * Xero dokumentiert nicht, ob es Punkte oder Aktionen zählt – deshalb werden die Werte
 * vor allem relativ gedeutet: gegen den Schnitt des eigenen Teams im selben Match.
 * Das macht 2v2 und 4v4 vergleichbar (1,0 = genau Teamschnitt).
 */

export type Role = 'Runner' | 'Verteidiger' | 'Bodyguard' | 'Fragger' | 'Allrounder';

export const ROLE_INFO: Record<Role, string> = {
  Runner: 'Holt den Fumbi und trägt ihn rein – überdurchschnittlich viele Rebounds und Touchdowns im Team.',
  Verteidiger: 'Stoppt gegnerische Angriffe – mehr Defense als der Teamschnitt.',
  Bodyguard: 'Kämpft den eigenen Fumbi-Träger frei – mehr Offense als der Teamschnitt.',
  Fragger: 'Jagt Kills – mehr Kills und Kill-Assists als der Teamschnitt, egal wo der Fumbi ist.',
  Allrounder: 'Keine Aufgabe sticht klar heraus – macht von allem etwas.',
};

/** Unter so vielen Matches mit Xero-Details wird keine Rolle vergeben. */
export const MIN_ROLE_GAMES = 5;

/** Ab diesem Vielfachen des Teamschnitts gilt ein Bereich als Schwerpunkt. */
const ROLE_THRESHOLD = 1.1;

export type RoleMetric = 'offense' | 'defense' | 'rebounds' | 'goals' | 'kills' | 'deaths' | 'killAssists' | 'damageReceived';
const METRICS: RoleMetric[] = ['offense', 'defense', 'rebounds', 'goals', 'kills', 'deaths', 'killAssists', 'damageReceived'];

export interface RoleStats {
  name: string;
  /** Matches mit Xero-Details */
  games: number;
  perGame: Record<RoleMetric, number>;
  /** Vielfaches des Teamschnitts (1,0 = Durchschnitt des eigenen Teams) */
  index: Record<RoleMetric, number>;
  /** eigene Touchdowns pro Rebound */
  conversion: number;
  /** null bei zu wenigen Matches */
  role: Role | null;
}

const value = (line: PlayerLine, metric: RoleMetric) => line[metric] ?? 0;

export function roleOf(index: Record<RoleMetric, number>): Role {
  const candidates: [Role, number][] = [
    ['Runner', (index.rebounds + index.goals) / 2],
    ['Verteidiger', index.defense],
    ['Bodyguard', index.offense],
    ['Fragger', (index.kills + index.killAssists) / 2],
  ];
  const [role, strength] = candidates.reduce((best, c) => (c[1] > best[1] ? c : best));
  return strength >= ROLE_THRESHOLD ? role : 'Allrounder';
}

export function roleStats(matches: Match[]): RoleStats[] {
  const totals = new Map<string, { games: number; own: Record<RoleMetric, number>; team: Record<RoleMetric, number> }>();
  const zero = () => Object.fromEntries(METRICS.map((m) => [m, 0])) as Record<RoleMetric, number>;

  for (const match of matches) {
    if (!match.players.every((p) => p.kills !== undefined)) continue;
    for (const line of match.players) {
      const mates = match.players.filter((p) => p.team === line.team);
      if (!totals.has(line.name)) totals.set(line.name, { games: 0, own: zero(), team: zero() });
      const t = totals.get(line.name)!;
      t.games++;
      for (const m of METRICS) {
        t.own[m] += value(line, m);
        t.team[m] += mates.reduce((sum, p) => sum + value(p, m), 0) / mates.length;
      }
    }
  }

  return Array.from(totals, ([name, t]) => {
    const perGame = zero();
    const index = zero();
    for (const m of METRICS) {
      perGame[m] = t.own[m] / t.games;
      index[m] = t.team[m] > 0 ? t.own[m] / t.team[m] : 1;
    }
    return {
      name,
      games: t.games,
      perGame,
      index,
      conversion: t.own.rebounds > 0 ? t.own.goals / t.own.rebounds : 0,
      role: t.games >= MIN_ROLE_GAMES ? roleOf(index) : null,
    };
  });
}
