import { Star } from 'lucide-react';
import { useMemo } from 'react';
import { Delta, PlayerName } from '@/components/Bits';
import { fmtDate, fmtDuration, fmtInt, fmtSigned } from '@/lib/format';
import type { EloEntry } from '@/lib/s4/elo';
import { useScope } from '@/lib/s4/scope';
import { mvpsOf } from '@/lib/s4/stats';
import type { Match } from '@/lib/s4/types';
import { cn } from '@/lib/utils';

/** ELO-Änderungen pro Match-ID für den aktuellen Filter. */
export function useEloByMatch(): Map<string, EloEntry> {
  const { elo } = useScope();
  return useMemo(() => new Map(elo.map((e) => [e.match.id, e])), [elo]);
}

export function MatchCard({ match, elo, highlight }: { match: Match; elo?: EloEntry; highlight?: string }) {
  const mvps = mvpsOf(match);
  const detailed = match.players.some((p) => p.kills !== undefined);

  return (
    <article className="rounded-lg border border-border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5 text-sm">
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground">#{match.number}</span> ·{' '}
          {match.dateEstimated ? <span title="Datum geschätzt – das genaue Spieldatum ist nicht bekannt">ca. {fmtDate(match.date)}</span> : fmtDate(match.date)} · {match.mode} · Season{' '}
          {match.season}
          {match.map && ` · ${match.map}`} · {fmtDuration(match.durationSec)}
        </span>
        {match.source === 'sheet' && (
          <span className="text-xs text-muted-foreground" title="Aus der alten Screenshot-Auswertung übernommen">
            Screenshot-Daten
          </span>
        )}
      </header>
      <div className="grid gap-px bg-border md:grid-cols-2">
        {([0, 1] as const).map((team) => {
          const won = match.winner === team;
          const players = match.players.filter((p) => p.team === team).sort((a, b) => b.score - a.score);
          return (
            <section key={team} className="bg-card px-4 py-3">
              <div className="mb-2 flex items-baseline justify-between">
                <span className={cn('text-sm font-semibold', won ? 'text-foreground' : 'text-muted-foreground')}>
                  {won ? 'Sieg' : match.winner === null ? 'Unentschieden' : 'Niederlage'}
                </span>
                <span className={cn('text-2xl font-bold tabular-nums', !won && 'text-muted-foreground')}>{match.score[team]}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground">
                      <th className="py-1 text-left font-normal">Spieler</th>
                      <th className="py-1 text-right font-normal" title="Touchdowns">TD</th>
                      <th className="py-1 text-right font-normal" title="Touchdown-Assists">A</th>
                      {detailed && <th className="py-1 text-right font-normal" title="Kills / Deaths">K/D</th>}
                      <th className="py-1 text-right font-normal" title="Damage">DMG</th>
                      <th className="py-1 text-right font-normal" title="Punkte">PTS</th>
                      <th className="py-1 text-right font-normal" title="ELO-Änderung">ELO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((p) => {
                      const change = elo?.changes.get(p.name);
                      return (
                        <tr key={p.name} className={cn(highlight === p.name && 'bg-secondary/60')}>
                          <td className="py-1 pr-2">
                            <span className="inline-flex items-center gap-1.5">
                              <PlayerName name={p.name} />
                              {mvps.includes(p.name) && <Star className="size-3.5 fill-current text-[#c98500]" aria-label="MVP (höchster Score)" />}
                            </span>
                          </td>
                          <td className="py-1 text-right tabular-nums">{p.goals}</td>
                          <td className="py-1 text-right tabular-nums">{p.assists}</td>
                          {detailed && <td className="py-1 text-right tabular-nums">{p.kills ?? '–'}/{p.deaths ?? '–'}</td>}
                          <td className="py-1 text-right tabular-nums">{fmtInt(p.damage)}</td>
                          <td className="py-1 text-right tabular-nums">{p.score}</td>
                          <td className="py-1 text-right">
                            {change ? <Delta value={change.delta}>{fmtSigned(change.delta)}</Delta> : '–'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
    </article>
  );
}
