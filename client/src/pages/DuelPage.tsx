import { useState } from 'react';
import { Empty, PlayerDot, Section, StatTile } from '@/components/Bits';
import { MatchCard, useEloByMatch } from '@/components/MatchCard';
import { PlayerSelect } from '@/components/PlayerSelect';
import { fmt1, fmt2, fmtInt, fmtPct } from '@/lib/format';
import { useScope } from '@/lib/s4/scope';
import { headToHead, lineOf } from '@/lib/s4/stats';
import type { Match, PlayerLine } from '@/lib/s4/types';

const COMPARE: { label: string; value: (l: PlayerLine) => number; format: (v: number) => string }[] = [
  { label: 'Ø Touchdowns', value: (l) => l.goals, format: fmt2 },
  { label: 'Ø TD-Assists', value: (l) => l.assists, format: fmt2 },
  { label: 'Ø Damage', value: (l) => l.damage, format: fmtInt },
  { label: 'Ø Punkte', value: (l) => l.score, format: fmt1 },
];

const average = (matches: Match[], name: string, pick: (l: PlayerLine) => number) =>
  matches.reduce((sum, m) => sum + pick(lineOf(m, name)!), 0) / (matches.length || 1);

export default function DuelPage() {
  const { matches, players } = useScope();
  const eloByMatch = useEloByMatch();
  const names = players.map((p) => p.name);
  const [a, setA] = useState(names[0] ?? '');
  const [b, setB] = useState(names[1] ?? '');

  const valid = names.includes(a) && names.includes(b) && a !== b;
  const h2h = valid ? headToHead(matches, a, b) : null;
  const against = h2h?.matches.filter((m) => lineOf(m, a)!.team !== lineOf(m, b)!.team) ?? [];

  return (
    <>
      <Section
        title="Head-to-Head"
        description="Bilanz gegeneinander und miteinander im gewählten Filter"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <PlayerSelect value={a} onChange={setA} players={names} label="Spieler A" />
            <span className="text-sm text-muted-foreground">vs.</span>
            <PlayerSelect value={b} onChange={setB} players={names} label="Spieler B" />
          </div>
        }
      >
        {!valid || !h2h ? (
          <Empty>Wähle zwei verschiedene Spieler.</Empty>
        ) : h2h.matches.length === 0 ? (
          <Empty>{a} und {b} haben im gewählten Filter nie im selben Match gespielt.</Empty>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatTile label={`${a} gewinnt gegen ${b}`} value={`${h2h.against.wins} von ${h2h.against.games}`} hint={h2h.against.games ? fmtPct(h2h.against.winrate) : undefined} />
              <StatTile label={`${b} gewinnt gegen ${a}`} value={`${h2h.against.losses} von ${h2h.against.games}`} hint={h2h.against.games ? fmtPct(1 - h2h.against.winrate) : undefined} />
              <StatTile label="Zusammen gewonnen" value={`${h2h.together.wins} von ${h2h.together.games}`} hint={h2h.together.games ? fmtPct(h2h.together.winrate) : undefined} />
              <StatTile label="Gemeinsame Matches" value={h2h.matches.length} />
            </div>

            {against.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">Leistung in den {against.length} Duellen</h3>
                <table className="w-full max-w-lg text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 text-left font-medium">Kennzahl</th>
                      {[a, b].map((n) => (
                        <th key={n} className="py-2 text-right font-medium">
                          <span className="inline-flex items-center gap-1.5"><PlayerDot name={n} />{n}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARE.map((c) => {
                      const [va, vb] = [average(against, a, c.value), average(against, b, c.value)];
                      return (
                        <tr key={c.label} className="border-t border-border">
                          <td className="py-2">{c.label}</td>
                          <td className={`py-2 text-right tabular-nums ${va >= vb ? 'font-semibold' : 'text-muted-foreground'}`}>{c.format(va)}</td>
                          <td className={`py-2 text-right tabular-nums ${vb >= va ? 'font-semibold' : 'text-muted-foreground'}`}>{c.format(vb)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Section>

      {valid && against.length > 0 && (
        <Section title="Letzte Duelle">
          <div className="space-y-3">
            {[...against].reverse().slice(0, 5).map((m) => (
              <MatchCard key={m.id} match={m} elo={eloByMatch.get(m.id)} />
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
