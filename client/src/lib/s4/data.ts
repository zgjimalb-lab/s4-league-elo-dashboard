import matchesJson from '@data/matches.json?raw';
import players from '@data/players.json';
import { prepareMatches } from './rules';
import type { StoredMatch } from './types';

const stored: StoredMatch[] = JSON.parse(matchesJson).matches;

export const { matches: ALL_MATCHES, excluded: EXCLUDED } = prepareMatches(stored);

export const GROUP: string[] = players.group;

export const SEASONS: number[] = Array.from(new Set(ALL_MATCHES.map((m) => m.season)));
export const CURRENT_SEASON = SEASONS[SEASONS.length - 1] ?? 1;

/** Vorhandene Modi, kleinste Teams zuerst */
export const MODES = Array.from(new Set(ALL_MATCHES.map((m) => m.mode))).sort((a, b) => parseInt(a) - parseInt(b));

export const LAST_MATCH_DATE = ALL_MATCHES[ALL_MATCHES.length - 1]?.date ?? null;

/** Unter so vielen Spielen im gewählten Zeitraum gilt ein Spieler als „vorläufig“. */
export const PROVISIONAL_GAMES = 10;
