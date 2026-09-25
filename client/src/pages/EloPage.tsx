import { useState } from 'react';
import { Delta, Empty, PlayerDot, PlayerName, Section } from '@/components/Bits';
import { EloChart, Legend } from '@/components/charts';
import { SortableTable, type Column } from '@/components/SortableTable';
import { fmtInt, fmtSigned } from '@/lib/format';
import { ELO_K, ELO_START } from '@/lib/s4/elo';
import { useScope, type PlayerRow } from '@/lib/s4/scope';
import { cn } from '@/lib/utils';

const columns: Column<PlayerRow>[] = [
  { key: 'name', header: 'Spieler', cell: (p) => <PlayerName name={p.name} provisional={p.provisional} />, sort: (p) => p.name },
  { key: 'current', header: 'Aktuell', align: 'right', cell: (p) => fmtInt(p.elo!.current), sort: (p) => p.elo!.current },
  { key: 'peak', header: 'Peak', align: 'right', cell: (p) => fmtInt(p.elo!.peak), sort: (p) => p.elo!.peak },
  { key: 'lowest', header: 'Tiefstwert', align: 'right', cell: (p) => fmtInt(p.elo!.lowest), sort: (p) => p.elo!.lowest },
  {
    key: 'lastTen', header: 'Δ letzte 10', align: 'right',
    cell: (p) => <Delta value={p.elo!.lastTen}>{fmtSigned(p.elo!.lastTen)}</Delta>, sort: (p) => p.elo!.lastTen,
  },
  { key: 'games', header: 'Spiele', align: 'right', cell: (p) => p.elo!.games, sort: (p) => p.elo!.games },
];

export default function EloPage() {
  const { players, elo, eloLabel, season } = useScope();
  const withElo = players.filter((p) => p.elo);
  // null = Standardauswahl: die vier besten Spieler mit mindestens 10 Spielen (mehr Linien werden unlesbar)
  const [picked, setPicked] = useState<string[] | null>(null);
  const defaults = withElo.filter((p) => !p.provisional).slice(0, 4).map((p) => p.name);
  const selected = (picked ?? (defaults.length ? defaults : withElo.slice(0, 4).map((p) => p.name))).filter((name) =>
    withElo.some((p) => p.name === name),
  );

  if (!elo.length) return <Empty>Keine Matches für diesen Filter.</Empty>;

  const toggle = (name: string) =>
    setPicked(selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name]);

  return (
    <>
      <Section
        title={eloLabel}
        description={
          season === 'all'
            ? 'Ewige ELO: läuft über alle Seasons ohne Reset.'
            : `Jede Season startet für alle bei ${fmtInt(ELO_START)}. X-Achse: Matches in dieser Season.`
        }
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {withElo.map((p) => {
            const on = selected.includes(p.name);
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => toggle(p.name)}
                aria-pressed={on}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors',
                  on ? 'border-foreground/30 bg-secondary text-foreground' : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                <PlayerDot name={p.name} className={cn(!on && 'opacity-30')} />
                {p.name}
              </button>
            );
          })}
        </div>
        {selected.length ? (
          <>
            <EloChart entries={elo} players={selected} />
            <div className="mt-3">{selected.length > 1 && <Legend players={selected} />}</div>
          </>
        ) : (
          <Empty>Wähle mindestens einen Spieler aus.</Empty>
        )}
      </Section>

      <Section title="ELO-Tabelle" flush>
        <SortableTable columns={columns} rows={withElo} rowKey={(p) => p.name} initialSort={{ key: 'current', desc: true }} />
      </Section>

      <p className="text-xs text-muted-foreground">
        Berechnung: Jeder Spieler wird gegen den ELO-Schnitt des gegnerischen Teams gewertet (K = {ELO_K}, Start{' '}
        {fmtInt(ELO_START)}). „Alle“ nutzt eine gemeinsame Wertung über alle Teamgrößen; jede Teamgröße (2v2, 3v3, …) hat zusätzlich eine eigene.
      </p>
    </>
  );
}
