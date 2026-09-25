import type { Match, Mode, PlayerLine, StoredMatch } from './types';

/** Mindestanteil der Spielzeit, damit ein Spieler für ein Match gewertet wird (Nachzügler/Leaver darunter fallen raus). */
export const MIN_PLAYTIME_SHARE = 0.5;
/** Kleinste Teamgröße, die zählt (1v1 zählt nicht). */
export const MIN_TEAM_SIZE = 2;
/** Spielpause in Tagen, nach der eine neue Season beginnt. */
export const SEASON_GAP_DAYS = 90;

export type ExclusionReason = 'uneven' | 'size' | 'leaver' | 'no-winner';

export const EXCLUSION_LABELS: Record<ExclusionReason, string> = {
  uneven: 'Ungleiche Teams (z.B. 3v2)',
  size: '1v1 oder leeres Team',
  leaver: 'Nach Abzug von Spielern unter 50 % Spielzeit ungleiche Teams',
  'no-winner': 'Kein Sieger',
};

/**
 * Entscheidet, ob ein Match für die Statistik zählt, und mit welchen Spielern:
 * Spieler mit weniger als MIN_PLAYTIME_SHARE der Spielzeit (Nachzügler, Leaver) werden nicht
 * gewertet. Das Match zählt für die übrigen, wenn dann gleich große Teams ab 2v2 übrig bleiben.
 * Gespeichert werden ohnehin nur Touchdown-Matches der Gruppe.
 */
export function classify(
  match: StoredMatch,
): { mode: Mode; players: PlayerLine[]; benched: string[] } | { excluded: ExclusionReason } {
  const duration = match.durationSec;
  const isShort = (p: PlayerLine) => Boolean(duration && p.playtime !== null && p.playtime < duration * MIN_PLAYTIME_SHARE);
  const players = match.players.filter((p) => !isShort(p));
  const benched = match.players.filter(isShort).map((p) => p.name);

  const sizes = [0, 1].map((team) => players.filter((p) => p.team === team).length);
  if (sizes[0] !== sizes[1]) return { excluded: benched.length ? 'leaver' : 'uneven' };
  if (sizes[0] < MIN_TEAM_SIZE) return { excluded: benched.length ? 'leaver' : 'size' };
  if (match.winner === null) return { excluded: 'no-winner' };
  return { mode: `${sizes[0]}v${sizes[1]}`, players, benched };
}

const daysBetween = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86_400_000;

/**
 * Filtert die gezählten Matches, nummeriert sie und ordnet Seasons zu:
 * Nach mehr als SEASON_GAP_DAYS Tagen ohne Match beginnt automatisch eine neue Season.
 */
export function prepareMatches(stored: StoredMatch[]): {
  matches: Match[];
  excluded: { match: StoredMatch; reason: ExclusionReason }[];
} {
  const matches: Match[] = [];
  const excluded: { match: StoredMatch; reason: ExclusionReason }[] = [];
  let season = 1;
  let lastDate: string | null = null;

  for (const match of stored) {
    const result = classify(match);
    if ('excluded' in result) {
      excluded.push({ match, reason: result.excluded });
      continue;
    }
    if (lastDate && daysBetween(lastDate, match.date) > SEASON_GAP_DAYS) {
      season += 1;
    }
    lastDate = match.date;
    matches.push({ ...match, players: result.players, benched: result.benched, number: matches.length + 1, mode: result.mode, season });
  }
  return { matches, excluded };
}
