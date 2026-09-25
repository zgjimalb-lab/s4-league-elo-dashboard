import { useState } from 'react';
import { Delta, Empty, Form, PlayerName, Section, StatTile } from '@/components/Bits';
import { PlayerBarChart } from '@/components/charts';
import { SortableTable, type Column } from '@/components/SortableTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fmt1, fmt2, fmtDate, fmtInt, fmtPct, fmtSigned } from '@/lib/format';
import { EXCLUDED } from '@/lib/s4/data';
import { EXCLUSION_LABELS, type ExclusionReason } from '@/lib/s4/rules';
import { seasonLabel, useScope, type PlayerRow } from '@/lib/s4/scope';

const METRICS: { key: string; label: string; value: (p: PlayerRow) => number; format: (v: number) => string }[] = [
  { key: 'winrate', label: 'Winrate', value: (p) => p.winrate, format: fmtPct },
  { key: 'score', label: 'Ø Punkte', value: (p) => p.perGame.score, format: fmt1 },
  { key: 'goals', label: 'Ø Touchdowns', value: (p) => p.perGame.goals, format: fmt2 },
  { key: 'assists', label: 'Ø TD-Assists', value: (p) => p.perGame.assists, format: fmt2 },
  { key: 'damage', label: 'Ø Damage', value: (p) => p.perGame.damage, format: fmtInt },
  { key: 'goalShare', label: 'Anteil Team-Touchdowns', value: (p) => p.goalShare, format: fmtPct },
  { key: 'damageShare', label: 'Anteil Team-Damage', value: (p) => p.damageShare, format: fmtPct },
  { key: 'scorePerMin', label: 'Punkte pro Minute', value: (p) => p.perMinute.score, format: fmt2 },
  { key: 'mvps', label: 'MVPs', value: (p) => p.mvps, format: fmtInt },
];

const rankColumns: Column<PlayerRow>[] = [
  { key: 'rank', header: '#', cell: (_, i) => <span className="text-muted-foreground">{i + 1}</span> },
  { key: 'name', header: 'Spieler', cell: (p) => <PlayerName name={p.name} provisional={p.provisional} />, sort: (p) => p.name },
  { key: 'elo', header: 'ELO', align: 'right', cell: (p) => (p.elo ? fmtInt(p.elo.current) : '–'), sort: (p) => p.elo?.current ?? 0 },
  {
    key: 'trend', header: 'Δ 10', align: 'right', title: 'ELO-Änderung über die letzten 10 Matches',
    cell: (p) => (p.elo ? <Delta value={p.elo.lastTen}>{fmtSigned(p.elo.lastTen)}</Delta> : '–'),
    sort: (p) => p.elo?.lastTen ?? 0,
  },
  { key: 'games', header: 'Spiele', align: 'right', cell: (p) => p.games, sort: (p) => p.games },
  { key: 'record', header: 'S–N', align: 'right', cell: (p) => `${p.wins}–${p.losses}`, sort: (p) => p.wins - p.losses },
  { key: 'winrate', header: 'Winrate', align: 'right', cell: (p) => fmtPct(p.winrate), sort: (p) => p.winrate },
  { key: 'goals', header: 'Ø TD', align: 'right', cell: (p) => fmt2(p.perGame.goals), sort: (p) => p.perGame.goals },
  { key: 'assists', header: 'Ø A', align: 'right', title: 'Touchdown-Assists pro Spiel', cell: (p) => fmt2(p.perGame.assists), sort: (p) => p.perGame.assists },
  { key: 'damage', header: 'Ø DMG', align: 'right', cell: (p) => fmtInt(p.perGame.damage), sort: (p) => p.perGame.damage },
  { key: 'score', header: 'Ø PTS', align: 'right', cell: (p) => fmt1(p.perGame.score), sort: (p) => p.perGame.score },
  { key: 'mvps', header: 'MVP', align: 'right', title: 'Höchster Score im Match', cell: (p) => p.mvps, sort: (p) => p.mvps },
  { key: 'form', header: 'Form', cell: (p) => <Form results={p.form} /> },
];

const styleColumns: Column<PlayerRow>[] = [
  { key: 'name', header: 'Spieler', cell: (p) => <PlayerName name={p.name} provisional={p.provisional} />, sort: (p) => p.name },
  { key: 'goalShare', header: 'TD-Anteil', align: 'right', title: 'Anteil an den Touchdowns des eigenen Teams', cell: (p) => fmtPct(p.goalShare), sort: (p) => p.goalShare },
  { key: 'damageShare', header: 'DMG-Anteil', align: 'right', title: 'Anteil am Damage des eigenen Teams', cell: (p) => fmtPct(p.damageShare), sort: (p) => p.damageShare },
  { key: 'dpm', header: 'DMG/min', align: 'right', cell: (p) => fmtInt(p.perMinute.damage), sort: (p) => p.perMinute.damage },
  { key: 'spm', header: 'PTS/min', align: 'right', cell: (p) => fmt2(p.perMinute.score), sort: (p) => p.perMinute.score },
  {
    key: 'kd', header: 'K/D', align: 'right', title: 'Nur Matches aus der Xero API (ab Nov. 2025, ohne alte Screenshot-Daten)',
    cell: (p) => (p.detailed.games ? fmt2(p.detailed.kd) : '–'), sort: (p) => (p.detailed.games ? p.detailed.kd : -1),
  },
  {
    key: 'defense', header: 'Ø Defense', align: 'right', title: 'Defense-Aktionen pro Spiel (nur API-Matches)',
    cell: (p) => (p.detailed.games ? fmt1(p.detailed.defense / p.detailed.games) : '–'),
    sort: (p) => (p.detailed.games ? p.detailed.defense / p.detailed.games : -1),
  },
  {
    key: 'rebounds', header: 'Ø Rebounds', align: 'right', title: 'Ball-Rebounds pro Spiel (nur API-Matches)',
    cell: (p) => (p.detailed.games ? fmt1(p.detailed.rebounds / p.detailed.games) : '–'),
    sort: (p) => (p.detailed.games ? p.detailed.rebounds / p.detailed.games : -1),
  },
];

export default function Leaderboard() {
  const { players, matches, season, eloLabel } = useScope();
  const [metric, setMetric] = useState(METRICS[0].key);
  const active = METRICS.find((m) => m.key === metric)!;

  if (!matches.length) return <Empty>Keine Matches für diesen Filter.</Empty>;

  const ranked = players.filter((p) => !p.provisional);
  const leader = ranked[0];
  const streaker = [...players].sort((a, b) => b.bestWinStreak - a.bestWinStreak)[0];
  const excludedByReason = EXCLUDED.reduce<Partial<Record<ExclusionReason, number>>>((acc, e) => {
    acc[e.reason] = (acc[e.reason] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Matches" value={fmtInt(matches.length)} hint={`${seasonLabel(season)} · ${fmtDate(matches[0].date)} – ${fmtDate(matches[matches.length - 1].date)}`} />
        <StatTile label="Spieler" value={players.length} hint={`${ranked.length} mit mindestens 10 Spielen`} />
        <StatTile label="Platz 1" value={leader ? leader.name : '–'} hint={leader?.elo ? `${fmtInt(leader.elo.current)} ELO` : 'noch niemand mit 10 Spielen'} />
        <StatTile label="Längste Siegesserie" value={streaker ? `${streaker.bestWinStreak} Siege` : '–'} hint={streaker?.name} />
      </div>

      <Section title="Rangliste" description={`Sortiert nach aktueller ${eloLabel}. Spieler mit weniger als 10 Spielen stehen als „vorläufig“ hinten.`} flush>
        <SortableTable columns={rankColumns} rows={players} rowKey={(p) => p.name} rowClassName={(p) => (p.provisional ? 'opacity-70' : undefined)} />
      </Section>

      <Section
        title="Vergleich"
        description="Eine Kennzahl, alle Spieler"
        action={
          <Select value={metric} onValueChange={setMetric}>
            <SelectTrigger className="w-56" aria-label="Kennzahl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METRICS.map((m) => (
                <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      >
        <PlayerBarChart rows={players.map((p) => ({ name: p.name, value: active.value(p) }))} format={active.format} />
      </Section>

      <Section
        title="Spielstil"
        description="Anteile am eigenen Team und Werte pro Minute – fairer als reine Summen, weil nicht jeder vorne Touchdowns macht."
        flush
      >
        <SortableTable columns={styleColumns} rows={players} rowKey={(p) => p.name} initialSort={{ key: 'goalShare', desc: true }} />
      </Section>

      {EXCLUDED.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Nicht gezählt (alle Seasons):{' '}
          {Object.entries(excludedByReason)
            .map(([reason, count]) => `${count}× ${EXCLUSION_LABELS[reason as ExclusionReason]}`)
            .join(' · ')}
        </p>
      )}
    </>
  );
}
