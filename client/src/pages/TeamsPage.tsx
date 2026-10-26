import { useMemo } from 'react';
import { Empty, PlayerDot, Section } from '@/components/Bits';
import { SortableTable, type Column } from '@/components/SortableTable';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { fmtDate, fmtPct } from '@/lib/format';
import { ALL_MATCHES, CURRENT_SEASON, isMember, LAST_MATCH_DATE, MODES, PROVISIONAL_GAMES } from '@/lib/s4/data';
import { computeElo } from '@/lib/s4/elo';
import { seasonLabel, useScope } from '@/lib/s4/scope';
import { playerStats } from '@/lib/s4/stats';
import { teamChances, type TeamChance } from '@/lib/s4/teams';
import type { Mode } from '@/lib/s4/types';

const DEFAULT_MODE: Mode = '3v3';

/** Gesamt-ELO nach dem letzten Match */
const RATINGS = computeElo(ALL_MATCHES).ratings;

/** Wer gerade mitspielt: Gruppenmitglieder mit genug Spielen in der aktuellen Season, stärkster zuerst */
const POOL = playerStats(ALL_MATCHES.filter((m) => m.season === CURRENT_SEASON))
  .filter((s) => isMember(s.name) && s.games >= PROVISIONAL_GAMES)
  .map((s) => s.name)
  .sort((a, b) => (RATINGS.get(b) ?? 0) - (RATINGS.get(a) ?? 0));

const teamSize = (mode: Mode) => parseInt(mode);
const MODE_OPTIONS = MODES.filter((m) => POOL.length >= teamSize(m) * 2);

export default function TeamsPage() {
  const { season, mode, setFilter } = useScope();
  const shown = MODE_OPTIONS.find((m) => m === mode) ?? (MODE_OPTIONS.includes(DEFAULT_MODE) ? DEFAULT_MODE : MODE_OPTIONS[0]);

  const teams = useMemo(() => {
    if (!shown) return [];
    const matches = ALL_MATCHES.filter((m) => m.mode === shown && (season === 'all' || m.season === season));
    return teamChances(POOL, RATINGS, teamSize(shown), matches);
  }, [shown, season]);

  const columns: Column<TeamChance>[] = [
    {
      key: 'team', header: 'Team', sort: (t) => t.key,
      cell: (t) => (
        <span className="inline-flex flex-wrap items-center gap-x-3">
          {t.players.map((p) => (
            <span key={p} className="inline-flex items-center gap-1.5"><PlayerDot name={p} />{p}</span>
          ))}
        </span>
      ),
    },
    {
      key: 'chance', header: 'Siegchance', align: 'right', sort: (t) => t.chance,
      title: 'Laut Gesamt-ELO, im Schnitt gegen alle Teams, die die übrigen Spieler bilden können',
      cell: (t) => fmtPct(t.chance),
    },
    {
      key: 'winrate', header: 'Bilanz', align: 'right', sort: (t) => t.record?.winrate ?? -1,
      title: 'Winrate genau dieser Aufstellung (Spielzahl in Klammern)',
      cell: (t) =>
        t.record ? (
          <>
            {fmtPct(t.record.winrate)} <span className="text-muted-foreground">({t.record.games})</span>
          </>
        ) : (
          <span className="text-muted-foreground">–</span>
        ),
    },
  ];

  const modeToggle = (
    <ToggleGroup type="single" variant="outline" size="sm" value={shown} onValueChange={(v) => v && setFilter({ mode: v as Mode })}>
      {MODE_OPTIONS.map((m) => (
        <ToggleGroupItem key={m} value={m} className="px-3">{m}</ToggleGroupItem>
      ))}
    </ToggleGroup>
  );

  return (
    <Section
      title={shown ? `Teamchancen im ${shown}` : 'Teamchancen'}
      description={
        <>
          Alle möglichen Teams aus {POOL.join(', ')} (mind. {PROVISIONAL_GAMES} Spiele in Season {CURRENT_SEASON}).
          Siegchance laut Gesamt-ELO{LAST_MATCH_DATE && ` vom ${fmtDate(LAST_MATCH_DATE)}`}, im Schnitt gegen alle Teams,
          die die übrigen Spieler bilden können. Bilanz: Winrate genau dieser Aufstellung ({seasonLabel(season)}).
        </>
      }
      action={MODE_OPTIONS.length > 1 ? modeToggle : undefined}
      flush
    >
      {teams.length ? (
        <SortableTable columns={columns} rows={teams} rowKey={(t) => t.key} initialSort={{ key: 'chance', desc: true }} />
      ) : (
        <Empty>Zu wenige aktive Spieler für ein Match.</Empty>
      )}
    </Section>
  );
}
