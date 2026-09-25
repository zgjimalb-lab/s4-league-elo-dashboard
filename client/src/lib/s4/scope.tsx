import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useSearch } from 'wouter';
import { navigate } from 'wouter/use-browser-location';
import { ALL_MATCHES, CURRENT_SEASON, MODES, PROVISIONAL_GAMES, SEASONS } from './data';
import { computeElo, eloSummary, type EloEntry, type PlayerEloSummary } from './elo';
import { playerStats, type PlayerStats } from './stats';
import type { Match, Mode } from './types';

export type SeasonFilter = number | 'all';
export type ModeFilter = Mode | 'all';

export interface PlayerRow extends PlayerStats {
  elo: PlayerEloSummary | null;
  provisional: boolean;
}

interface Scope {
  season: SeasonFilter;
  mode: ModeFilter;
  setFilter: (next: { season?: SeasonFilter; mode?: ModeFilter }) => void;
  /** Matches im gewählten Zeitraum und Modus, chronologisch */
  matches: Match[];
  /** ELO-Verlauf passend zum Filter: Season-ELO (mit Reset) oder ewige ELO bei „Alle Seasons“ */
  elo: EloEntry[];
  eloLabel: string;
  players: PlayerRow[];
}

const ScopeContext = createContext<Scope | null>(null);

function parseFilters(search: string): { season: SeasonFilter; mode: ModeFilter } {
  const params = new URLSearchParams(search);
  const rawSeason = params.get('season');
  const season = rawSeason === 'all' ? 'all' : SEASONS.includes(Number(rawSeason)) ? Number(rawSeason) : CURRENT_SEASON;
  const rawMode = params.get('mode');
  const mode = MODES.find((m) => m === rawMode) ?? 'all';
  return { season, mode };
}

export function ScopeProvider({ children }: { children: ReactNode }) {
  const search = useSearch();
  const { season, mode } = parseFilters(search);

  const setFilter = useCallback(
    (next: { season?: SeasonFilter; mode?: ModeFilter }) => {
      const params = new URLSearchParams(search);
      const s = next.season ?? season;
      const m = next.mode ?? mode;
      s === CURRENT_SEASON ? params.delete('season') : params.set('season', String(s));
      m === 'all' ? params.delete('mode') : params.set('mode', m);
      const query = params.toString();
      navigate(`${window.location.pathname}${query ? `?${query}` : ''}`, { replace: true });
    },
    [search, season, mode],
  );

  const value = useMemo<Scope>(() => {
    const byMode = mode === 'all' ? ALL_MATCHES : ALL_MATCHES.filter((m) => m.mode === mode);
    const matches = season === 'all' ? byMode : byMode.filter((m) => m.season === season);
    const timeline = computeElo(byMode, { resetEachSeason: season !== 'all' });
    const elo = season === 'all' ? timeline.entries : timeline.entries.filter((e) => e.match.season === season);
    const modeLabel = mode === 'all' ? 'Gesamt' : mode;
    const eloLabel = season === 'all' ? `Ewige ELO · ${modeLabel}` : `Season-ELO · ${modeLabel}`;

    const players = playerStats(matches).map((stats) => ({
      ...stats,
      elo: eloSummary(elo, stats.name),
      provisional: stats.games < PROVISIONAL_GAMES,
    }));
    players.sort((a, b) => Number(a.provisional) - Number(b.provisional) || (b.elo?.current ?? 0) - (a.elo?.current ?? 0));
    return { season, mode, setFilter, matches, elo, eloLabel, players };
  }, [season, mode, setFilter]);

  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>;
}

export function useScope(): Scope {
  const scope = useContext(ScopeContext);
  if (!scope) throw new Error('useScope muss innerhalb von <ScopeProvider> verwendet werden');
  return scope;
}

export const seasonLabel = (season: SeasonFilter) => (season === 'all' ? 'Alle Seasons' : `Season ${season}`);
