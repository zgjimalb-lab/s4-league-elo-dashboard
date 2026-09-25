import { useMemo, useState, type ReactNode } from 'react';
import { Empty, PlayerDot, PlayerName, Section } from '@/components/Bits';
import { DivergingBar } from '@/components/charts';
import { SortableTable, type Column } from '@/components/SortableTable';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { fmt1, fmtPct, fmtSignedPct } from '@/lib/format';
import { useScope } from '@/lib/s4/scope';
import { duoStats, lineupStats, type DuoStats, type LineupStats } from '@/lib/s4/stats';

const MIN_GAMES_OPTIONS = [1, 3, 5, 10];

function synergyCell(value: number, max: number) {
  return (
    <span className="inline-flex items-center justify-end gap-3">
      <span className="tabular-nums">{fmtSignedPct(value)}</span>
      <DivergingBar value={value} max={max} />
    </span>
  );
}

export default function DuosPage() {
  const { matches, players, mode } = useScope();
  const [minGames, setMinGames] = useState(3);

  const duos = useMemo(() => duoStats(matches, players), [matches, players]);
  // Aufstellungen ab drei Spielern: bei 2v2 sind sie identisch mit den Duos
  const teams = useMemo(() => lineupStats(matches, players).filter((l) => l.players.length >= 3), [matches, players]);
  const shownDuos = duos.filter((d) => d.games >= minGames);
  const shownTeams = teams.filter((l) => l.games >= minGames);
  const maxDuoSynergy = Math.max(0.01, ...shownDuos.map((d) => Math.abs(d.synergy)));
  const maxTeamSynergy = Math.max(0.01, ...shownTeams.map((l) => Math.abs(l.synergy)));
  const onlyTrios = teams.every((l) => l.players.length === 3);

  const duoColumns: Column<DuoStats>[] = [
    {
      key: 'duo', header: 'Duo', sort: (d) => d.players.join(),
      cell: (d) => (
        <span className="inline-flex flex-wrap items-center gap-x-2">
          <PlayerName name={d.players[0]} /> <span className="text-muted-foreground">+</span> <PlayerName name={d.players[1]} />
        </span>
      ),
    },
    { key: 'games', header: 'Spiele', align: 'right', cell: (d) => d.games, sort: (d) => d.games },
    { key: 'record', header: 'S–N', align: 'right', cell: (d) => `${d.wins}–${d.losses}`, sort: (d) => d.wins - d.losses },
    { key: 'winrate', header: 'Winrate', align: 'right', cell: (d) => fmtPct(d.winrate), sort: (d) => d.winrate },
    {
      key: 'synergy', header: 'Synergie', align: 'right', sort: (d) => d.synergy,
      title: 'Winrate zusammen minus Durchschnitt der beiden Einzel-Winrates',
      cell: (d) => synergyCell(d.synergy, maxDuoSynergy),
    },
  ];

  const teamColumns: Column<LineupStats>[] = [
    {
      key: 'lineup', header: onlyTrios ? 'Trio' : 'Team', sort: (l) => l.key,
      cell: (l) => (
        <span className="inline-flex flex-wrap items-center gap-x-3">
          {l.players.map((p) => (
            <span key={p} className="inline-flex items-center gap-1.5"><PlayerDot name={p} />{p}</span>
          ))}
        </span>
      ),
    },
    ...(onlyTrios ? [] : [{ key: 'size', header: 'Modus', cell: (l: LineupStats) => `${l.players.length}v${l.players.length}`, sort: (l: LineupStats) => l.players.length }]),
    { key: 'games', header: 'Spiele', align: 'right', cell: (l) => l.games, sort: (l) => l.games },
    { key: 'record', header: 'S–N', align: 'right', cell: (l) => `${l.wins}–${l.losses}`, sort: (l) => l.wins - l.losses },
    { key: 'winrate', header: 'Winrate', align: 'right', cell: (l) => fmtPct(l.winrate), sort: (l) => l.winrate },
    {
      key: 'goals', header: 'Ø TD für : gegen', align: 'right', sort: (l) => (l.goalsFor - l.goalsAgainst) / l.games,
      cell: (l) => `${fmt1(l.goalsFor / l.games)} : ${fmt1(l.goalsAgainst / l.games)}`,
    },
    {
      key: 'synergy', header: 'Synergie', align: 'right', sort: (l) => l.synergy,
      title: 'Winrate zusammen minus Durchschnitt der Einzel-Winrates',
      cell: (l) => synergyCell(l.synergy, maxTeamSynergy),
    },
  ];

  const filter = (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Min. Spiele</span>
      <ToggleGroup type="single" variant="outline" size="sm" value={String(minGames)} onValueChange={(v) => v && setMinGames(Number(v))}>
        {MIN_GAMES_OPTIONS.map((n) => (
          <ToggleGroupItem key={n} value={String(n)} className="px-3">{n}</ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );

  const duoSection: ReactNode = (
    <Section
      key="duos"
      title="Duo-Synergien"
      description={
        mode === '3v3'
          ? 'Welche zwei harmonieren im 3er-Team – egal, wer der Dritte ist?'
          : 'Welche Paare gewinnen zusammen öfter, als ihre Einzel-Winrates erwarten lassen? Die Teams sind zufällig, deshalb ist das ein fairer Vergleich.'
      }
      action={mode === '3v3' ? undefined : filter}
      flush
    >
      {shownDuos.length ? (
        <SortableTable columns={duoColumns} rows={shownDuos} rowKey={(d) => d.players.join('|')} initialSort={{ key: 'synergy', desc: true }} />
      ) : (
        <Empty>Keine Duos mit so vielen gemeinsamen Spielen.</Empty>
      )}
    </Section>
  );

  const teamSection: ReactNode = teams.length > 0 && (
    <Section
      key="teams"
      title={onlyTrios ? 'Trio-Synergien' : 'Team-Synergien'}
      description="Exakt diese Aufstellung zusammen – im Vergleich zu den Einzel-Winrates. Trios kommen seltener zustande als Duos, achte auf die Spielzahl."
      action={mode === '3v3' ? filter : undefined}
      flush
    >
      {shownTeams.length ? (
        <SortableTable columns={teamColumns} rows={shownTeams} rowKey={(l) => l.key} initialSort={{ key: 'synergy', desc: true }} />
      ) : (
        <Empty>Keine Aufstellungen mit so vielen gemeinsamen Spielen.</Empty>
      )}
    </Section>
  );

  // Im 3v3 zuerst die Trios, sonst zuerst die Duos
  return <>{mode === '3v3' ? [teamSection, duoSection] : [duoSection, teamSection]}</>;
}
