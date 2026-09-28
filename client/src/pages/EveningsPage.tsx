import { useMemo, useState } from 'react';
import { Delta, Empty, PlayerName, Section, StatTile } from '@/components/Bits';
import { MatchCard, useEloByMatch } from '@/components/MatchCard';
import { SortableTable, type Column } from '@/components/SortableTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fmt1, fmtDay, fmtPct, fmtSigned } from '@/lib/format';
import { isMember } from '@/lib/s4/data';
import { winnerChance } from '@/lib/s4/elo';
import { eloDeltas, groupEvenings } from '@/lib/s4/evenings';
import { useScope } from '@/lib/s4/scope';
import { duoStats, playerStats, type PlayerStats } from '@/lib/s4/stats';
import type { Match } from '@/lib/s4/types';

interface EveningRow extends PlayerStats {
  eloDelta: number;
}

const columns: Column<EveningRow>[] = [
  { key: 'name', header: 'Spieler', cell: (p) => <PlayerName name={p.name} />, sort: (p) => p.name },
  {
    key: 'elo', header: 'ELO', align: 'right', title: 'ELO-Änderung an diesem Abend',
    cell: (p) => <Delta value={p.eloDelta}>{fmtSigned(p.eloDelta)}</Delta>, sort: (p) => p.eloDelta,
  },
  { key: 'games', header: 'Spiele', align: 'right', cell: (p) => p.games, sort: (p) => p.games },
  { key: 'record', header: 'S–N', align: 'right', cell: (p) => `${p.wins}–${p.losses}`, sort: (p) => p.wins - p.losses },
  { key: 'winrate', header: 'Winrate', align: 'right', cell: (p) => fmtPct(p.winrate), sort: (p) => p.winrate },
  { key: 'goals', header: 'TD', align: 'right', title: 'Touchdowns an diesem Abend', cell: (p) => p.goals, sort: (p) => p.goals },
  { key: 'score', header: 'Ø PTS', align: 'right', cell: (p) => fmt1(p.perGame.score), sort: (p) => p.perGame.score },
  { key: 'mvps', header: 'MVP', align: 'right', title: 'Höchster Score im Match', cell: (p) => p.mvps, sort: (p) => p.mvps },
];

/** Ein Duo braucht so viele gemeinsame Matches, um „Duo des Abends“ zu werden. */
const MIN_DUO_GAMES = 2;

const matchCount = (n: number) => `${n} ${n === 1 ? 'Match' : 'Matches'}`;

export default function EveningsPage() {
  const { matches, elo } = useScope();
  const eloByMatch = useEloByMatch();
  const evenings = useMemo(() => groupEvenings(matches), [matches]);
  const [picked, setPicked] = useState<string | null>(null);
  const evening = evenings.find((e) => e.date === picked) ?? evenings[0];

  const summary = useMemo(() => {
    if (!evening) return null;
    const deltas = eloDeltas(evening.matches, elo);
    const stats = playerStats(evening.matches);
    const rows: EveningRow[] = stats.filter((p) => isMember(p.name)).map((p) => ({ ...p, eloDelta: deltas.get(p.name) ?? 0 }));
    const winner = [...rows].sort((a, b) => b.eloDelta - a.eloDelta)[0];
    const mvp = [...rows].sort((a, b) => b.mvps - a.mvps || b.perGame.score - a.perGame.score)[0];
    const duo = duoStats(evening.matches, stats)
      .filter((d) => d.games >= MIN_DUO_GAMES && d.players.every(isMember))
      .sort((a, b) => b.wins - a.wins || b.winrate - a.winrate)[0];
    // nur echte Außenseiter-Siege
    const upset = evening.matches
      .map((match) => {
        const entry = eloByMatch.get(match.id);
        return { match, chance: entry ? winnerChance(entry) : null };
      })
      .filter((u): u is { match: Match; chance: number } => u.chance !== null && u.chance < 0.5)
      .sort((a, b) => a.chance - b.chance)[0];
    return { rows, winner, mvp, duo, upset };
  }, [evening, elo, eloByMatch]);

  if (!evening || !summary) return <Empty>Keine Matches für diesen Filter.</Empty>;
  const { rows, winner, mvp, duo, upset } = summary;
  const upsetWinners = upset?.match.players.filter((p) => p.team === upset.match.winner).map((p) => p.name) ?? [];

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Spielabend · {fmtDay(evening.date)}</h2>
          <p className="text-sm text-muted-foreground">
            {matchCount(evening.matches.length)}. Matches nach Mitternacht zählen zum Abend davor.
            {evening.estimated && ' Das Datum ist hier teils nur geschätzt (alte Matches ohne genaues Spieldatum).'}
          </p>
        </div>
        <Select value={evening.date} onValueChange={setPicked}>
          <SelectTrigger className="w-64" aria-label="Spielabend">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {evenings.map((e) => (
              <SelectItem key={e.date} value={e.date}>
                {fmtDay(e.date)} · {matchCount(e.matches.length)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Gewinner des Abends"
          value={winner && winner.eloDelta > 0 ? winner.name : '–'}
          hint={winner && winner.eloDelta > 0 && `${fmtSigned(winner.eloDelta)} ELO · ${winner.wins}–${winner.losses}`}
        />
        <StatTile
          label="MVP des Abends"
          value={mvp && mvp.mvps > 0 ? mvp.name : '–'}
          hint={mvp && mvp.mvps > 0 && `${mvp.mvps}× höchster Score · Ø ${fmt1(mvp.perGame.score)} PTS`}
        />
        <StatTile
          label="Duo des Abends"
          value={duo ? duo.players.join(' + ') : '–'}
          hint={duo ? `${duo.wins}–${duo.losses} zusammen` : `niemand ${MIN_DUO_GAMES}× im selben Team`}
        />
        <StatTile
          label="Größte Überraschung"
          value={upset ? fmtPct(upset.chance) : '–'}
          hint={upset ? `Siegchance vorher · ${upsetWinners.join(' + ')} (#${upset.match.number})` : 'kein Außenseiter-Sieg an diesem Abend'}
        />
      </div>

      <Section title="Tabelle des Abends" description="Sortiert nach ELO-Gewinn an diesem Abend" flush>
        <SortableTable columns={columns} rows={rows} rowKey={(p) => p.name} initialSort={{ key: 'elo', desc: true }} />
      </Section>

      <Section title="Matches des Abends" description="In Spielreihenfolge">
        <div className="space-y-3">
          {evening.matches.map((m) => (
            <MatchCard key={m.id} match={m} elo={eloByMatch.get(m.id)} />
          ))}
        </div>
      </Section>
    </>
  );
}
