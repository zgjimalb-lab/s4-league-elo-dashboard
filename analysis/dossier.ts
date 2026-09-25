/**
 * Erzeugt das Daten-Dossier für die KI-Spieleranalyse (siehe analysis/PROMPT.md).
 *
 *   pnpm analysis:dossier            # letzte Season
 *   pnpm analysis:dossier --season 2
 *
 * Nutzt dieselbe Rechenlogik wie das Dashboard (client/src/lib/s4), damit alle
 * Zahlen im Dossier exakt zu dem passen, was auf der Seite steht.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { computeElo, eloSummary, type EloEntry } from '../client/src/lib/s4/elo';
import { prepareMatches } from '../client/src/lib/s4/rules';
import { duoStats, headToHead, lineOf, mvpsOf, playerStats, resultOf, type PlayerStats } from '../client/src/lib/s4/stats';
import type { Match, PlayerLine, StoredMatch } from '../client/src/lib/s4/types';

const MIN_GAMES = 15;
const MIN_PAIR_GAMES = 5;
const CLOSE_MARGIN = 2; // knappes Spiel: höchstens 2 Touchdowns Unterschied
const BLOWOUT_MARGIN = 5;

const root = new URL('..', import.meta.url);
const stored: StoredMatch[] = JSON.parse(readFileSync(new URL('data/matches.json', root), 'utf8')).matches;
const { matches: all } = prepareMatches(stored);

const seasonArg = process.argv.indexOf('--season');
const season = seasonArg > 0 ? Number(process.argv[seasonArg + 1]) : Math.max(...all.map((m) => m.season));
const seasonMatches = all.filter((m) => m.season === season);
if (!seasonMatches.length) throw new Error(`Season ${season} hat keine Matches`);

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;
const pct = (n: number) => Math.round(n * 1000) / 10; // Anteil → Prozent mit 1 Nachkommastelle
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const std = (xs: number[]) => Math.sqrt(mean(xs.map((x) => (x - mean(xs)) ** 2)));
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0;
};

/** Kern-Kennzahlen eines Spielers über eine Menge von Matches */
function block(stats: PlayerStats) {
  const d = stats.detailed;
  return {
    games: stats.games,
    wins: stats.wins,
    losses: stats.losses,
    winratePct: pct(stats.winrate),
    perGame: { touchdowns: r2(stats.perGame.goals), tdAssists: r2(stats.perGame.assists), damage: Math.round(stats.perGame.damage), points: r1(stats.perGame.score) },
    perMinute: { touchdowns: r2(stats.perMinute.goals), damage: Math.round(stats.perMinute.damage), points: r2(stats.perMinute.score) },
    shareOfTeamPct: { touchdowns: pct(stats.goalShare), damage: pct(stats.damageShare) },
    mvpRatePct: pct(stats.mvps / stats.games),
    bestWinStreak: stats.bestWinStreak,
    apiDetails: d.games
      ? {
          games: d.games,
          killsPerGame: r2(d.kills / d.games),
          deathsPerGame: r2(d.deaths / d.games),
          kd: r2(d.kd),
          defensePerGame: r2(d.defense / d.games),
          offensePerGame: r2(d.offense / d.games),
          reboundsPerGame: r2(d.rebounds / d.games),
        }
      : null,
  };
}

const metricPickers: Record<string, (s: PlayerStats) => number | null> = {
  winrate: (s) => s.winrate,
  touchdownsPerGame: (s) => s.perGame.goals,
  tdAssistsPerGame: (s) => s.perGame.assists,
  damagePerGame: (s) => s.perGame.damage,
  pointsPerGame: (s) => s.perGame.score,
  pointsPerMinute: (s) => s.perMinute.score,
  touchdownShare: (s) => s.goalShare,
  damageShare: (s) => s.damageShare,
  mvpRate: (s) => s.mvps / s.games,
  kd: (s) => (s.detailed.games ? s.detailed.kd : null),
  killsPerGame: (s) => (s.detailed.games ? s.detailed.kills / s.detailed.games : null),
  deathsPerGame: (s) => (s.detailed.games ? s.detailed.deaths / s.detailed.games : null),
  // Xero dokumentiert diese Zähler nicht; Bedeutung laut S4-Wiki siehe analysis/PROMPT.md
  defensePerGame: (s) => (s.detailed.games ? s.detailed.defense / s.detailed.games : null),
  offensePerGame: (s) => (s.detailed.games ? s.detailed.offense / s.detailed.games : null),
  reboundsPerGame: (s) => (s.detailed.games ? s.detailed.rebounds / s.detailed.games : null),
};
/** Kennzahlen, bei denen weniger besser ist */
const lowerIsBetter = new Set(['deathsPerGame']);

/** Rang (1 = bester) und Gruppenmedian je Kennzahl, nur unter qualifizierten Spielern */
function rankings(name: string, pool: PlayerStats[]) {
  const out: Record<string, { value: number; rank: number; of: number; groupMedian: number }> = {};
  for (const [key, pick] of Object.entries(metricPickers)) {
    const values = pool.map((s) => ({ name: s.name, v: pick(s) })).filter((x): x is { name: string; v: number } => x.v !== null);
    const mine = values.find((x) => x.name === name);
    if (!mine) continue;
    const sorted = [...values].sort((a, b) => (lowerIsBetter.has(key) ? a.v - b.v : b.v - a.v));
    const isShare = key === 'winrate' || key.endsWith('Share') || key === 'mvpRate';
    const fmt = (v: number) => (isShare ? pct(v) : r2(v));
    out[key] = { value: fmt(mine.v), rank: sorted.findIndex((x) => x.name === name) + 1, of: sorted.length, groupMedian: fmt(median(values.map((x) => x.v))) };
  }
  return out;
}

function recordOf(matches: Match[], name: string) {
  const results = matches.map((m) => resultOf(m, lineOf(m, name)!));
  const wins = results.filter((r) => r === 'W').length;
  return { games: results.length, wins, winratePct: results.length ? pct(wins / results.length) : null };
}

function phase(matches: Match[], name: string) {
  const lines = matches.map((m) => lineOf(m, name)!);
  const modes = Array.from(new Set(matches.map((m) => m.mode))).sort();
  return {
    ...recordOf(matches, name),
    // Modus-Mix beachten: 3v3 hat mehr Damage/Punkte pro Spieler als 2v2 – sonst falsche „Trends“
    modeMixPct: Object.fromEntries(modes.map((mode) => [mode, pct(matches.filter((m) => m.mode === mode).length / matches.length)])),
    touchdownsPerGame: r2(mean(lines.map((l) => l.goals))),
    pointsPerGame: r1(mean(lines.map((l) => l.score))),
    damagePerGame: Math.round(mean(lines.map((l) => l.damage))),
  };
}

function eloBlock(entries: EloEntry[], name: string) {
  const summary = eloSummary(entries, name);
  if (!summary) return null;
  const mine = entries.filter((e) => e.changes.has(name));
  return { start: mine[0].changes.get(name)!.before, end: summary.current, peak: summary.peak, low: summary.lowest, change: summary.current - mine[0].changes.get(name)!.before, lastTen: summary.lastTen };
}

function teamShare(match: Match, line: PlayerLine, pick: (l: PlayerLine) => number) {
  const team = match.players.filter((p) => p.team === line.team).reduce((sum, p) => sum + pick(p), 0);
  return team ? pick(line) / team : 0;
}

function dossierFor(name: string, pool: PlayerStats[], careerPool: PlayerStats[]) {
  const own = seasonMatches.filter((m) => lineOf(m, name));
  const lines = own.map((m) => lineOf(m, name)!);
  const seasonStats = pool.find((s) => s.name === name)!;
  const careerStats = careerPool.find((s) => s.name === name)!;
  const thirds = [0, 1, 2].map((i) => own.slice(Math.floor((i * own.length) / 3), Math.floor(((i + 1) * own.length) / 3)));

  const byMode = Object.fromEntries(
    Array.from(new Set(own.map((m) => m.mode))).map((mode) => {
      const modeMatches = own.filter((m) => m.mode === mode);
      const modeStats = playerStats(modeMatches).find((s) => s.name === name)!;
      const ladder = computeElo(all.filter((m) => m.mode === mode)).entries.filter((e) => e.match.season === season);
      return [mode, { ...block(modeStats), elo: eloBlock(ladder, name) }];
    }),
  );

  const margin = (m: Match) => Math.abs(m.score[0] - m.score[1]);
  const topScorerGames = own.filter((m) => {
    const line = lineOf(m, name)!;
    return Math.max(...m.players.filter((p) => p.team === line.team).map((p) => p.goals)) === line.goals;
  });
  const carryGames = own.filter((m) => teamShare(m, lineOf(m, name)!, (l) => l.goals) > 0.5);

  const duos = duoStats(seasonMatches, pool)
    .filter((d) => d.players.includes(name) && d.games >= MIN_PAIR_GAMES)
    .map((d) => ({ with: d.players.find((p) => p !== name)!, games: d.games, wins: d.wins, winratePct: pct(d.winrate), synergyPct: pct(d.synergy) }))
    .sort((a, b) => b.synergyPct - a.synergyPct);
  const opponents = pool
    .filter((s) => s.name !== name)
    .map((s) => ({ against: s.name, ...headToHead(seasonMatches, name, s.name).against }))
    .filter((h) => h.games >= MIN_PAIR_GAMES)
    .map((h) => ({ against: h.against, games: h.games, wins: h.wins, winratePct: pct(h.winrate) }))
    .sort((a, b) => a.winratePct - b.winratePct);

  const best = (pick: (l: PlayerLine) => number) => {
    const m = own.reduce((a, b) => (pick(lineOf(b, name)!) > pick(lineOf(a, name)!) ? b : a));
    const l = lineOf(m, name)!;
    return { match: m.number, date: m.date, mode: m.mode, touchdowns: l.goals, points: l.score, damage: l.damage, result: resultOf(m, l) };
  };

  let worstLossStreak = 0;
  let run = 0;
  for (const m of own) {
    run = resultOf(m, lineOf(m, name)!) === 'L' ? run + 1 : 0;
    worstLossStreak = Math.max(worstLossStreak, run);
  }

  return {
    name,
    season: { ...block(seasonStats), elo: eloBlock(computeElo(all).entries.filter((e) => e.match.season === season), name) },
    career: { ...block(careerStats), elo: eloBlock(computeElo(all).entries, name) },
    groupComparisonSeason: rankings(name, pool),
    trendWithinSeason: {
      note: 'Season-Matches des Spielers in drei gleich große Abschnitte geteilt (früh → spät)',
      early: phase(thirds[0], name),
      middle: phase(thirds[1], name),
      late: phase(thirds[2], name),
      last20: phase(own.slice(-20), name),
    },
    byMode,
    consistency: {
      pointsStdDev: r1(std(lines.map((l) => l.score))),
      pointsCoefficientOfVariationPct: pct(std(lines.map((l) => l.score)) / (mean(lines.map((l) => l.score)) || 1)),
      touchdownsStdDev: r2(std(lines.map((l) => l.goals))),
      gamesWithZeroTouchdownsPct: pct(lines.filter((l) => l.goals === 0).length / lines.length),
      gamesWith6PlusTouchdownsPct: pct(lines.filter((l) => l.goals >= 6).length / lines.length),
    },
    clutch: {
      closeGames: { note: `Endstand mit höchstens ${CLOSE_MARGIN} Touchdowns Unterschied`, ...recordOf(own.filter((m) => margin(m) <= CLOSE_MARGIN), name) },
      blowouts: { note: `mindestens ${BLOWOUT_MARGIN} Touchdowns Unterschied`, ...recordOf(own.filter((m) => margin(m) >= BLOWOUT_MARGIN), name) },
    },
    teamRole: {
      winrateWhenTeamTopTouchdownScorerPct: recordOf(topScorerGames, name).winratePct,
      gamesAsTeamTopTouchdownScorer: topScorerGames.length,
      winrateWhenMoreThanHalfOfTeamTouchdownsPct: recordOf(carryGames, name).winratePct,
      gamesWithMoreThanHalfOfTeamTouchdowns: carryGames.length,
      matchMvpHighestScore: own.filter((m) => mvpsOf(m).includes(name)).length,
    },
    streaks: { bestWinStreak: seasonStats.bestWinStreak, worstLossStreak, current: seasonStats.streak },
    teammates: duos,
    opponents,
    bestGames: { mostPoints: best((l) => l.score), mostTouchdowns: best((l) => l.goals) },
  };
}

const pool = playerStats(seasonMatches);
const careerPool = playerStats(all);
const qualified = pool.filter((s) => s.games >= MIN_GAMES).sort((a, b) => b.games - a.games);

const dossier = {
  generatedAt: new Date().toISOString().slice(0, 10),
  season,
  seasonRange: { from: seasonMatches[0].date, to: seasonMatches[seasonMatches.length - 1].date, matches: seasonMatches.length },
  rules: {
    minGamesForAnalysis: MIN_GAMES,
    minGamesForTeammateOrOpponent: MIN_PAIR_GAMES,
    ranksAmong: qualified.map((s) => s.name),
    dataNotes: [
      'Nur Touchdown, gleich große Teams ab 2v2, nur Gruppenmitglieder, Matches mit Leavern (<50 % Spielzeit) ausgeschlossen.',
      'apiDetails (Kills, Deaths, K/D, Defense, Offense, Rebounds) fehlen bei den alten Screenshot-Matches – games-Feld beachten, aber in den Texten nicht erwähnen.',
      'Defense, Offense und Rebounds zählt Xero ohne Dokumentation (Punkte oder Anzahl unklar) – nur relativ zur Liga deuten, siehe PROMPT.md.',
      'MVP (mvpRatePct, matchMvpHighestScore) = höchster Score im Match.',
      'Die Teams werden zufällig gebildet; Synergie = Winrate zusammen minus Durchschnitt der beiden Einzel-Winrates.',
      'ELO: Start 1500, K = 32, individuell gegen den ELO-Schnitt des Gegnerteams, kein Reset zwischen Seasons.',
      'Daten einiger Matches sind geschätzt (API liefert kein Datum); die Reihenfolge stimmt aber.',
    ],
  },
  groupAverageSeason: Object.fromEntries(
    Object.entries(metricPickers).map(([key, pick]) => {
      const values = qualified.map(pick).filter((v): v is number => v !== null);
      const isShare = key === 'winrate' || key.endsWith('Share') || key === 'mvpRate';
      return [key, isShare ? pct(mean(values)) : r2(mean(values))];
    }),
  ),
  players: qualified.map((s) => dossierFor(s.name, qualified, careerPool.filter((c) => qualified.some((q) => q.name === c.name)))),
  notAnalysed: pool.filter((s) => s.games < MIN_GAMES).map((s) => ({ name: s.name, games: s.games })),
};

const out = new URL(`analysis/dossier-season-${season}.json`, root);
writeFileSync(out, JSON.stringify(dossier, null, 2) + '\n');
console.log(`✓ Dossier Season ${season}: ${dossier.players.length} Spieler → analysis/dossier-season-${season}.json`);
if (dossier.notAnalysed.length) console.log(`  zu wenige Spiele: ${dossier.notAnalysed.map((p) => `${p.name} (${p.games})`).join(', ')}`);
