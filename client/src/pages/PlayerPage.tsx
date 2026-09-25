import { useMemo } from 'react';
import { useLocation, useParams, useSearch } from 'wouter';
import { Delta, Empty, Form, PlayerName, Section, StatTile } from '@/components/Bits';
import { EloChart } from '@/components/charts';
import { MatchCard, useEloByMatch } from '@/components/MatchCard';
import { PlayerSelect } from '@/components/PlayerSelect';
import { SortableTable, type Column } from '@/components/SortableTable';
import { fmt1, fmt2, fmtInt, fmtPct, fmtSigned, fmtSignedPct } from '@/lib/format';
import { useScope, type PlayerRow } from '@/lib/s4/scope';
import { duoStats, headToHead, lineOf, type WinRecord } from '@/lib/s4/stats';

interface Relation extends WinRecord {
  name: string;
}

const relationColumns = (label: string): Column<Relation>[] => [
  { key: 'name', header: label, cell: (r) => <PlayerName name={r.name} />, sort: (r) => r.name },
  { key: 'games', header: 'Spiele', align: 'right', cell: (r) => r.games, sort: (r) => r.games },
  { key: 'record', header: 'S–N', align: 'right', cell: (r) => `${r.wins}–${r.losses}`, sort: (r) => r.wins - r.losses },
  { key: 'winrate', header: 'Winrate', align: 'right', cell: (r) => fmtPct(r.winrate), sort: (r) => r.winrate },
];

/** Vergleich mit dem Durchschnitt aller Spieler im Filter. */
const PROFILE_METRICS: { label: string; value: (p: PlayerRow) => number; format: (v: number) => string }[] = [
  { label: 'Ø Touchdowns', value: (p) => p.perGame.goals, format: fmt2 },
  { label: 'Ø TD-Assists', value: (p) => p.perGame.assists, format: fmt2 },
  { label: 'Ø Damage', value: (p) => p.perGame.damage, format: fmtInt },
  { label: 'Ø Punkte', value: (p) => p.perGame.score, format: fmt1 },
  { label: 'Anteil Team-Touchdowns', value: (p) => p.goalShare, format: fmtPct },
  { label: 'Anteil Team-Damage', value: (p) => p.damageShare, format: fmtPct },
  { label: 'Damage pro Minute', value: (p) => p.perMinute.damage, format: fmtInt },
];

export default function PlayerPage() {
  const params = useParams<{ name?: string }>();
  const [, navigate] = useLocation();
  const search = useSearch();
  const { players, matches, elo } = useScope();
  const eloByMatch = useEloByMatch();

  const name = params.name ? decodeURIComponent(params.name) : players[0]?.name;
  const player = players.find((p) => p.name === name);

  const relations = useMemo(() => {
    if (!player) return { mates: [], rivals: [] };
    const mates = duoStats(matches, players)
      .filter((d) => d.players.includes(player.name))
      .map((d) => ({ ...d, name: d.players[0] === player.name ? d.players[1] : d.players[0] }));
    const rivals = players
      .filter((p) => p.name !== player.name)
      .map((p) => ({ name: p.name, ...headToHead(matches, player.name, p.name).against }))
      .filter((r) => r.games > 0);
    return { mates, rivals };
  }, [matches, players, player]);

  const select = (
    <PlayerSelect
      value={name ?? ''}
      players={players.map((p) => p.name)}
      onChange={(n) => navigate(`/spieler/${encodeURIComponent(n)}${search ? `?${search}` : ''}`)}
    />
  );

  if (!player) {
    return (
      <Section title="Spielerprofil" action={select}>
        <Empty>{name ? `${name} hat im gewählten Zeitraum keine Matches.` : 'Keine Spieler im gewählten Zeitraum.'}</Empty>
      </Section>
    );
  }

  const own = matches.filter((m) => lineOf(m, player.name)).reverse();
  const rank = players.filter((p) => !p.provisional).findIndex((p) => p.name === player.name) + 1;
  const averages = PROFILE_METRICS.map((metric) => ({
    ...metric,
    mine: metric.value(player),
    group: players.reduce((sum, p) => sum + metric.value(p), 0) / players.length,
  }));
  const best = [...relations.mates].filter((m) => m.games >= 3).sort((a, b) => b.winrate - a.winrate)[0];
  const nemesis = [...relations.rivals].filter((r) => r.games >= 3).sort((a, b) => a.winrate - b.winrate)[0];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">
          <PlayerName name={player.name} provisional={player.provisional} link={false} />
        </h2>
        {select}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="ELO"
          value={player.elo ? fmtInt(player.elo.current) : '–'}
          hint={player.elo && <>Peak {fmtInt(player.elo.peak)} · <Delta value={player.elo.lastTen}>{fmtSigned(player.elo.lastTen)}</Delta> letzte 10{rank ? ` · Platz ${rank}` : ''}</>}
        />
        <StatTile label="Winrate" value={fmtPct(player.winrate)} hint={`${player.wins} Siege, ${player.losses} Niederlagen`} />
        <StatTile label="Form" value={<Form results={player.form} />} hint={`Beste Serie: ${player.bestWinStreak} Siege`} />
        <StatTile label="MVPs" value={player.mvps} hint={`in ${player.games} Spielen`} />
      </div>

      {player.elo && (
        <Section title="ELO-Verlauf">
          <EloChart entries={elo.filter((e) => e.changes.has(player.name))} players={[player.name]} height={280} />
        </Section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Spielstil" description="Im Vergleich zum Schnitt aller Spieler im Filter" flush>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Kennzahl</th>
                <th className="px-4 py-2 text-right font-medium">{player.name}</th>
                <th className="px-4 py-2 text-right font-medium">Schnitt</th>
                <th className="px-4 py-2 text-right font-medium">Diff.</th>
              </tr>
            </thead>
            <tbody>
              {averages.map((a) => {
                const diff = a.group ? a.mine / a.group - 1 : 0;
                return (
                  <tr key={a.label} className="border-t border-border">
                    <td className="px-4 py-2">{a.label}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{a.format(a.mine)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{a.format(a.group)}</td>
                    <td className="px-4 py-2 text-right"><Delta value={diff}>{fmtSignedPct(diff)}</Delta></td>
                  </tr>
                );
              })}
              {player.detailed.games > 0 && (
                <tr className="border-t border-border">
                  <td className="px-4 py-2">K/D <span className="text-xs text-muted-foreground">({player.detailed.games} API-Matches)</span></td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmt2(player.detailed.kd)}</td>
                  <td className="px-4 py-2 text-right text-muted-foreground">
                    {fmtInt(player.detailed.kills)} / {fmtInt(player.detailed.deaths)}
                  </td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </Section>

        <div className="grid gap-6">
          <div className="grid grid-cols-2 gap-4">
            <StatTile label="Bester Mitspieler" value={best?.name ?? '–'} hint={best && `${fmtPct(best.winrate)} in ${best.games} Spielen`} />
            <StatTile label="Angstgegner" value={nemesis?.name ?? '–'} hint={nemesis && `nur ${fmtPct(nemesis.winrate)} in ${nemesis.games} Spielen`} />
          </div>
          <Section title="Mitspieler" flush>
            <SortableTable columns={relationColumns('Mit')} rows={relations.mates} rowKey={(r) => r.name} initialSort={{ key: 'games', desc: true }} />
          </Section>
          <Section title="Gegner" flush>
            <SortableTable columns={relationColumns('Gegen')} rows={relations.rivals} rowKey={(r) => r.name} initialSort={{ key: 'games', desc: true }} />
          </Section>
        </div>
      </div>

      <Section title="Letzte Matches" description={`${own.length} Matches im Filter`}>
        <div className="space-y-3">
          {own.slice(0, 5).map((m) => (
            <MatchCard key={m.id} match={m} elo={eloByMatch.get(m.id)} highlight={player.name} />
          ))}
        </div>
      </Section>
    </>
  );
}
