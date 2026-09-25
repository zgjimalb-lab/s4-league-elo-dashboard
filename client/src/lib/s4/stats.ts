import type { Match, PlayerLine } from './types';

export type Result = 'W' | 'L' | 'D';

export function resultOf(match: Match, player: PlayerLine): Result {
  if (match.winner === null) return 'D';
  return match.winner === player.team ? 'W' : 'L';
}

export function lineOf(match: Match, name: string): PlayerLine | undefined {
  return match.players.find((p) => p.name === name);
}

/** MVP = höchster Score im Match (bei Gleichstand mehrere). */
export function mvpsOf(match: Match): string[] {
  const best = Math.max(...match.players.map((p) => p.score));
  return match.players.filter((p) => p.score === best).map((p) => p.name);
}

export interface PlayerStats {
  name: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winrate: number;
  goals: number;
  assists: number;
  damage: number;
  score: number;
  mvps: number;
  perGame: { goals: number; assists: number; damage: number; score: number };
  /** pro Spielminute (Spielzeit des Spielers, sonst Matchdauer) */
  perMinute: { goals: number; damage: number; score: number };
  /** Anteil an den Touchdowns bzw. am Damage des eigenen Teams */
  goalShare: number;
  damageShare: number;
  /** Nur Matches aus der Xero API haben Kills/Deaths & Co. */
  detailed: {
    games: number;
    kills: number;
    deaths: number;
    kd: number;
    rebounds: number;
    offense: number;
    defense: number;
    healing: number;
  };
  /** letzte Ergebnisse, ältestes zuerst */
  form: Result[];
  streak: { result: Result; length: number } | null;
  bestWinStreak: number;
}

const ratio = (a: number, b: number) => (b > 0 ? a / b : 0);

export function playerStats(matches: Match[]): PlayerStats[] {
  const byPlayer = new Map<string, { match: Match; line: PlayerLine }[]>();
  for (const match of matches) {
    for (const line of match.players) {
      if (!byPlayer.has(line.name)) byPlayer.set(line.name, []);
      byPlayer.get(line.name)!.push({ match, line });
    }
  }

  return Array.from(byPlayer, ([name, games]) => {
    const results = games.map(({ match, line }) => resultOf(match, line));
    const sum = (pick: (l: PlayerLine) => number | undefined) =>
      games.reduce((total, { line }) => total + (pick(line) ?? 0), 0);
    const teamSum = (pick: (l: PlayerLine) => number) =>
      games.reduce(
        (total, { match, line }) =>
          total + match.players.filter((p) => p.team === line.team).reduce((s, p) => s + pick(p), 0),
        0,
      );
    const minutes = games.reduce(
      (total, { match, line }) => total + (line.playtime ?? match.durationSec ?? 0) / 60,
      0,
    );
    const detailedGames = games.filter(({ line }) => line.kills !== undefined);
    const detailedSum = (pick: (l: PlayerLine) => number | undefined) =>
      detailedGames.reduce((total, { line }) => total + (pick(line) ?? 0), 0);

    let bestWinStreak = 0;
    let run = 0;
    for (const r of results) {
      run = r === 'W' ? run + 1 : 0;
      bestWinStreak = Math.max(bestWinStreak, run);
    }
    let streakLength = 0;
    const last = results[results.length - 1];
    for (let i = results.length - 1; i >= 0 && results[i] === last; i--) streakLength++;

    const n = games.length;
    const goals = sum((l) => l.goals);
    const damage = sum((l) => l.damage);
    const score = sum((l) => l.score);
    const assists = sum((l) => l.assists);
    const kills = detailedSum((l) => l.kills);
    const deaths = detailedSum((l) => l.deaths);
    const wins = results.filter((r) => r === 'W').length;

    return {
      name,
      games: n,
      wins,
      losses: results.filter((r) => r === 'L').length,
      draws: results.filter((r) => r === 'D').length,
      winrate: ratio(wins, n),
      goals,
      assists,
      damage,
      score,
      mvps: games.filter(({ match }) => mvpsOf(match).includes(name)).length,
      perGame: { goals: ratio(goals, n), assists: ratio(assists, n), damage: ratio(damage, n), score: ratio(score, n) },
      perMinute: { goals: ratio(goals, minutes), damage: ratio(damage, minutes), score: ratio(score, minutes) },
      goalShare: ratio(goals, teamSum((p) => p.goals)),
      damageShare: ratio(damage, teamSum((p) => p.damage)),
      detailed: {
        games: detailedGames.length,
        kills,
        deaths,
        kd: deaths > 0 ? kills / deaths : kills,
        rebounds: detailedSum((l) => l.rebounds),
        offense: detailedSum((l) => l.offense),
        defense: detailedSum((l) => l.defense),
        healing: detailedSum((l) => l.healing),
      },
      form: results.slice(-5),
      streak: last ? { result: last, length: streakLength } : null,
      bestWinStreak,
    };
  });
}

// ---------------------------------------------------------------------------
// Teams, Duos, Head-to-Head
// ---------------------------------------------------------------------------

export interface WinRecord {
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winrate: number;
}

function addResult(record: Omit<WinRecord, 'winrate'>, result: Result) {
  record.games++;
  if (result === 'W') record.wins++;
  else if (result === 'L') record.losses++;
  else record.draws++;
}

const emptyRecord = () => ({ games: 0, wins: 0, losses: 0, draws: 0 });
const finish = <T extends Omit<WinRecord, 'winrate'>>(r: T): T & WinRecord => ({ ...r, winrate: ratio(r.wins, r.games) });

export const teamKey = (names: string[]) => [...names].sort((a, b) => a.localeCompare(b)).join(' + ');

export interface LineupStats extends WinRecord {
  key: string;
  players: string[];
  goalsFor: number;
  goalsAgainst: number;
  /** Winrate zusammen minus Durchschnitt der Einzel-Winrates */
  synergy: number;
}

/** Statistik pro exakter Team-Aufstellung (bei 3v3 also pro Trio). */
export function lineupStats(matches: Match[], individual: PlayerStats[]): LineupStats[] {
  const winrate = new Map(individual.map((p) => [p.name, p.winrate]));
  const lineups = new Map<string, Omit<LineupStats, 'winrate'>>();
  for (const match of matches) {
    for (const team of [0, 1] as const) {
      const players = match.players.filter((p) => p.team === team).map((p) => p.name);
      const key = teamKey(players);
      if (!lineups.has(key)) lineups.set(key, { key, players: key.split(' + '), goalsFor: 0, goalsAgainst: 0, synergy: 0, ...emptyRecord() });
      const lineup = lineups.get(key)!;
      addResult(lineup, match.winner === null ? 'D' : match.winner === team ? 'W' : 'L');
      lineup.goalsFor += match.score[team];
      lineup.goalsAgainst += match.score[1 - team];
    }
  }
  return Array.from(lineups.values(), (lineup) => {
    const done = finish(lineup);
    const expected = lineup.players.reduce((sum, p) => sum + (winrate.get(p) ?? 0), 0) / lineup.players.length;
    return { ...done, synergy: done.winrate - expected };
  });
}

export interface DuoStats extends WinRecord {
  players: [string, string];
  /** Winrate zusammen minus Durchschnitt der Einzel-Winrates (in denselben Matches-Filtern) */
  synergy: number;
}

/** Jedes Spielerpaar, das im selben Team stand. */
export function duoStats(matches: Match[], individual: PlayerStats[]): DuoStats[] {
  const winrate = new Map(individual.map((p) => [p.name, p.winrate]));
  const duos = new Map<string, Omit<WinRecord, 'winrate'> & { players: [string, string] }>();
  for (const match of matches) {
    for (const a of match.players) {
      for (const b of match.players) {
        if (a.team !== b.team || a.name.localeCompare(b.name) >= 0) continue;
        const key = `${a.name}|${b.name}`;
        if (!duos.has(key)) duos.set(key, { players: [a.name, b.name], ...emptyRecord() });
        addResult(duos.get(key)!, resultOf(match, a));
      }
    }
  }
  return Array.from(duos.values(), (duo) => {
    const done = finish(duo);
    const expected = ((winrate.get(duo.players[0]) ?? 0) + (winrate.get(duo.players[1]) ?? 0)) / 2;
    return { ...done, synergy: done.winrate - expected };
  });
}

export interface HeadToHead {
  /** a gegen b, aus Sicht von a */
  against: WinRecord;
  /** a und b im selben Team */
  together: WinRecord;
  matches: Match[];
}

export function headToHead(matches: Match[], a: string, b: string): HeadToHead {
  const against = emptyRecord();
  const together = emptyRecord();
  const shared: Match[] = [];
  for (const match of matches) {
    const la = lineOf(match, a);
    const lb = lineOf(match, b);
    if (!la || !lb) continue;
    shared.push(match);
    addResult(la.team === lb.team ? together : against, resultOf(match, la));
  }
  return { against: finish(against), together: finish(together), matches: shared };
}
