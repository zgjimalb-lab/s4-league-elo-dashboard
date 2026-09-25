import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { computeElo, eloSummary } from './elo';
import { classify, prepareMatches } from './rules';
import { duoStats, headToHead, lineupStats, playerStats } from './stats';
import type { PlayerLine, StoredMatch, TeamIndex } from './types';

let counter = 0;
function match(
  teams: [string[], string[]],
  winner: TeamIndex | null,
  extra: Partial<StoredMatch> = {},
  line: (name: string) => Partial<PlayerLine> = () => ({}),
): StoredMatch {
  return {
    id: `m${++counter}`,
    source: 'xero',
    date: '2026-01-01',
    map: null,
    durationSec: 600,
    score: [winner === 0 ? 10 : 5, winner === 1 ? 10 : 5],
    winner,
    players: teams.flatMap((names, team) =>
      names.map((name) => ({
        name, team: team as TeamIndex, playtime: 600, goals: 1, assists: 0, damage: 1000, score: 100, ...line(name),
      })),
    ),
    ...extra,
  };
}

describe('classify', () => {
  it('zählt 2v2 und 3v3', () => {
    expect(classify(match([['a', 'b'], ['c', 'd']], 0))).toMatchObject({ mode: '2v2', benched: [] });
    expect(classify(match([['a', 'b', 'c'], ['d', 'e', 'f']], 0))).toMatchObject({ mode: '3v3' });
  });
  it('zählt 4v4', () => {
    expect(classify(match([['a', 'b', 'c', 'd'], ['e', 'f', 'g', 'h']], 0))).toMatchObject({ mode: '4v4' });
  });
  it('ignoriert 3v2 und 1v1', () => {
    expect(classify(match([['a', 'b', 'c'], ['d', 'e']], 0))).toEqual({ excluded: 'uneven' });
    expect(classify(match([['a'], ['b']], 0))).toEqual({ excluded: 'size' });
  });
  it('wertet Nachzügler nicht, das Match zählt für die anderen', () => {
    const lateJoiner = match([['a', 'b', 'c', 'x'], ['d', 'e', 'f']], 0, {}, (n) => (n === 'x' ? { playtime: 200 } : {}));
    const result = classify(lateJoiner);
    expect(result).toMatchObject({ mode: '3v3', benched: ['x'] });
    expect('players' in result && result.players.map((p) => p.name)).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });
  it('schließt ein Match aus, wenn nach Abzug ungleiche Teams bleiben', () => {
    const leaver = match([['a', 'b'], ['c', 'd']], 0, {}, (n) => (n === 'c' ? { playtime: 200 } : {}));
    expect(classify(leaver)).toEqual({ excluded: 'leaver' });
  });
  it('alte Sheet-Matches ohne Spielzeit zählen', () => {
    expect(classify(match([['a', 'b'], ['c', 'd']], 1, {}, () => ({ playtime: null })))).toMatchObject({ mode: '2v2' });
  });
});

describe('prepareMatches', () => {
  it('startet nach mehr als 90 Tagen Pause eine neue Season', () => {
    const { matches } = prepareMatches([
      match([['a', 'b'], ['c', 'd']], 0, { date: '2025-12-18' }),
      match([['a', 'b'], ['c', 'd']], 0, { date: '2026-02-01' }),
      match([['a', 'b'], ['c', 'd']], 0, { date: '2026-09-25' }),
      match([['a', 'b'], ['c', 'd']], 0, { date: '2026-09-26' }),
    ]);
    expect(matches.map((m) => m.season)).toEqual([1, 1, 2, 2]);
    expect(matches.map((m) => m.number)).toEqual([1, 2, 3, 4]);
  });
});

describe('computeElo', () => {
  const prepared = (stored: StoredMatch[]) => prepareMatches(stored).matches;

  it('gibt bei gleicher ELO ±16', () => {
    const { ratings } = computeElo(prepared([match([['a', 'b'], ['c', 'd']], 0)]));
    expect(Object.fromEntries(ratings)).toEqual({ a: 1516, b: 1516, c: 1484, d: 1484 });
  });

  it('rechnet alle Spieler eines Matches vom Stand vor dem Match', () => {
    const stored = [match([['a', 'b'], ['c', 'd']], 0), match([['a', 'c'], ['b', 'd']], 0)];
    const { entries } = computeElo(prepared(stored));
    // a (1516) + c (1484) gegen b (1516) + d (1484): Gegner-Schnitt ist für alle 1500
    expect(entries[1].changes.get('b')!.before).toBe(1516);
    expect(entries[1].changes.get('d')!.delta).toBe(-15);
  });

  it('wertet Unentschieden als 0,5', () => {
    const { ratings } = computeElo(prepared([match([['a', 'b'], ['c', 'd']], 1)]));
    // Matches ohne Sieger filtert prepareMatches aus – die Formel selbst kann Unentschieden
    const drawn = { ...prepared([match([['a', 'b'], ['c', 'd']], 1)])[0], winner: null };
    const draw = computeElo([drawn]);
    expect(ratings.get('a')).toBe(1484);
    expect(draw.ratings.get('a')).toBe(1500);
  });

  it('läuft über eine neue Season hinweg ohne Reset weiter', () => {
    const stored = [
      match([['a', 'b'], ['c', 'd']], 0, { date: '2026-01-01' }),
      match([['a', 'b'], ['c', 'd']], 0, { date: '2026-06-01' }),
    ];
    const { entries } = computeElo(prepared(stored));
    expect(entries.map((e) => e.match.season)).toEqual([1, 2]);
    expect(entries[1].changes.get('a')!.before).toBe(1516);
    expect(eloSummary(entries, 'a')).toMatchObject({ current: 1531, peak: 1531, games: 2 });
  });
});

describe('Statistiken', () => {
  const stored = [
    match([['a', 'b'], ['c', 'd']], 0, {}, (n) => (n === 'a' ? { goals: 6, score: 200 } : {})),
    match([['a', 'c'], ['b', 'd']], 1),
    match([['a', 'b'], ['c', 'd']], 0),
  ];
  const { matches } = prepareMatches(stored);
  const stats = playerStats(matches);
  const a = stats.find((s) => s.name === 'a')!;

  it('zählt Siege, Form und Serien', () => {
    expect(a).toMatchObject({ games: 3, wins: 2, losses: 1, form: ['W', 'L', 'W'], bestWinStreak: 1 });
    expect(a.streak).toEqual({ result: 'W', length: 1 });
    expect(a.mvps).toBe(3); // bei Gleichstand (Match 2 und 3) zählen alle als MVP
  });

  it('berechnet Anteile am Team', () => {
    // Match 1: 6 von 7 Team-Toren, Match 2 und 3: je 1 von 2
    expect(a.goalShare).toBeCloseTo(8 / 11);
  });

  it('wertet Duos, Aufstellungen und Head-to-Head aus', () => {
    const duo = duoStats(matches, stats).find((d) => d.players.join() === 'a,b')!;
    expect(duo).toMatchObject({ games: 2, wins: 2 });
    const cd = lineupStats(matches, stats).find((l) => l.key === 'c + d')!;
    expect(cd).toMatchObject({ games: 2, wins: 0, goalsAgainst: 20 });
    // einzeln: c 0 von 3, d 1 von 3 (Schnitt 1/6) – zusammen 0 von 2
    expect(cd.synergy).toBeCloseTo(-1 / 6);
    const h2h = headToHead(matches, 'a', 'b');
    expect(h2h.against).toMatchObject({ games: 1, wins: 0, losses: 1 });
    expect(h2h.together).toMatchObject({ games: 2, wins: 2 });
  });
});

describe('data/matches.json', () => {
  const stored: StoredMatch[] = JSON.parse(readFileSync(new URL('../../../../data/matches.json', import.meta.url), 'utf8')).matches;
  const { matches } = prepareMatches(stored);

  it('ist chronologisch und eindeutig', () => {
    expect(new Set(stored.map((m) => m.id)).size).toBe(stored.length);
    stored.slice(1).forEach((m, i) => expect(m.date >= stored[i].date).toBe(true));
  });

  it('jedes gezählte Match hat einen Sieger, der zum Ergebnis passt', () => {
    for (const m of matches) {
      expect(m.winner).not.toBeNull();
      const [x, y] = m.score;
      if (x !== y) expect(m.winner).toBe(x > y ? 0 : 1);
    }
  });
});
