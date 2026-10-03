import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { computeElo, eloSummary, winnerChance } from './elo';
import { eloDeltas, eveningOf, groupEvenings } from './evenings';
import { roleOf, roleStats } from './roles';
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
  it('wertet von Hand markierte Spieler nicht, auch mit voller Spielzeit', () => {
    const manual = match([['a', 'b', 'x'], ['c', 'd']], 0, { benchedManually: ['x'] });
    expect(classify(manual)).toMatchObject({ mode: '2v2', benched: ['x'] });
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

  it('berechnet die Siegchance aus dem Team-Schnitt vor dem Match', () => {
    const stored = [match([['a', 'b'], ['c', 'd']], 0), match([['a', 'b'], ['c', 'd']], 1)];
    const { entries } = computeElo(prepared(stored));
    expect(entries[0].chance).toEqual([0.5, 0.5]);
    // a+b stehen bei 1516, c+d bei 1484: 32 Punkte Vorsprung
    expect(entries[1].chance[0]).toBeCloseTo(1 / (1 + 10 ** (-32 / 400)));
    expect(entries[1].chance[0] + entries[1].chance[1]).toBeCloseTo(1);
    expect(winnerChance(entries[1])).toBeCloseTo(entries[1].chance[1]);
  });
});

describe('Spielabende', () => {
  const at = (seenAt: string | undefined, date: string) => prepareMatches([match([['a', 'b'], ['c', 'd']], 0, { date, seenAt })]).matches[0];

  it('zählt Matches nach Mitternacht zum Abend davor', () => {
    expect(eveningOf(at('2026-09-27T23:40:00+02:00', '2026-09-27'))).toBe('2026-09-27');
    expect(eveningOf(at('2026-09-28T01:20:00+02:00', '2026-09-28'))).toBe('2026-09-27');
    expect(eveningOf(at('2026-09-28T19:00:00+02:00', '2026-09-28'))).toBe('2026-09-28');
    expect(eveningOf(at(undefined, '2025-12-18'))).toBe('2025-12-18');
  });

  it('gruppiert neueste zuerst und summiert die ELO pro Abend', () => {
    const { matches } = prepareMatches([
      match([['a', 'b'], ['c', 'd']], 0, { date: '2026-09-26' }),
      match([['a', 'b'], ['c', 'd']], 0, { date: '2026-09-27' }),
      match([['a', 'c'], ['b', 'd']], 0, { date: '2026-09-27' }),
    ]);
    const evenings = groupEvenings(matches);
    expect(evenings.map((e) => [e.date, e.matches.length])).toEqual([['2026-09-27', 2], ['2026-09-26', 1]]);
    const { entries } = computeElo(matches);
    const deltas = eloDeltas(evenings[0].matches, entries);
    const a = entries.slice(1).reduce((sum, e) => sum + e.changes.get('a')!.delta, 0);
    expect(deltas.get('a')).toBe(a);
  });
});

describe('Rollen', () => {
  const index = (overrides: Partial<Record<string, number>>) =>
    ({ offense: 1, defense: 1, rebounds: 1, goals: 1, kills: 1, deaths: 1, killAssists: 1, damageReceived: 1, ...overrides });

  it('nimmt den stärksten Schwerpunkt, sonst Allrounder', () => {
    expect(roleOf(index({ rebounds: 1.3, goals: 1.4 }))).toBe('Runner');
    expect(roleOf(index({ defense: 1.3 }))).toBe('Verteidiger');
    expect(roleOf(index({ offense: 1.2, defense: 1.15 }))).toBe('Bodyguard');
    expect(roleOf(index({ kills: 1.3, killAssists: 1.2 }))).toBe('Fragger');
    expect(roleOf(index({ defense: 1.05 }))).toBe('Allrounder');
  });

  it('vergleicht mit dem Schnitt des eigenen Teams und ignoriert Matches ohne Details', () => {
    const detailed = (defense: Record<string, number>) => (n: string) => ({ kills: 1, deaths: 1, defense: defense[n] ?? 0 });
    const { matches } = prepareMatches([
      ...Array.from({ length: 5 }, () => match([['a', 'b'], ['c', 'd']], 0, {}, detailed({ a: 6, b: 2, c: 4, d: 4 }))),
      match([['a', 'b'], ['c', 'd']], 0),
    ]);
    const a = roleStats(matches).find((r) => r.name === 'a')!;
    expect(a.games).toBe(5);
    expect(a.perGame.defense).toBe(6);
    expect(a.index.defense).toBeCloseTo(1.5); // 6 gegen Teamschnitt 4
    expect(a.role).toBe('Verteidiger');
    expect(roleStats(matches.slice(0, 2)).find((r) => r.name === 'a')!.role).toBeNull();
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

  it('zählt von Hand ergänzte Spieler nur fürs Ergebnis', () => {
    const extra = match([['a', 'b'], ['c', 'd']], 0, {}, (n) =>
      n === 'a' ? { playtime: null, goals: 0, damage: 0, score: 0, addedManually: true } : {},
    );
    const withExtra = playerStats(prepareMatches([...stored, extra]).matches).find((s) => s.name === 'a')!;
    expect(withExtra).toMatchObject({ games: 4, wins: 3 });
    expect(withExtra.perGame).toEqual(a.perGame);
    expect(withExtra.goalShare).toBeCloseTo(a.goalShare);
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
