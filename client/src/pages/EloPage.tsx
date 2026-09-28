import { useState } from 'react';
import { Delta, Empty, PlayerDot, PlayerName, Section } from '@/components/Bits';
import { EloChart, Legend } from '@/components/charts';
import { SortableTable, type Column } from '@/components/SortableTable';
import { fmtDate, fmtInt, fmtPct, fmtSigned } from '@/lib/format';
import { ELO_K, ELO_START, UPSET_CHANCE, winnerChance, type EloEntry } from '@/lib/s4/elo';
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

/** Unter diesem Abstand zu 50 % gibt es keinen echten Favoriten. */
const TOSS_UP_MARGIN = 0.05;

interface Upset {
  entry: EloEntry;
  chance: number;
}

const team = (entry: EloEntry, index: number | null) => (
  <span className="inline-flex flex-wrap gap-x-3 gap-y-1">
    {entry.match.players
      .filter((p) => p.team === index)
      .map((p) => (
        <PlayerName key={p.name} name={p.name} />
      ))}
  </span>
);

const upsetColumns: Column<Upset>[] = [
  { key: 'date', header: 'Datum', cell: (u) => <span className="whitespace-nowrap">#{u.entry.match.number} · {fmtDate(u.entry.match.date)}</span>, sort: (u) => u.entry.match.number },
  { key: 'winner', header: 'Sieger', cell: (u) => team(u.entry, u.entry.match.winner) },
  { key: 'chance', header: 'Chance vorher', align: 'right', title: 'Siegchance des Siegerteams laut ELO vor dem Match', cell: (u) => fmtPct(u.chance), sort: (u) => u.chance },
  { key: 'score', header: 'Ergebnis', align: 'right', cell: (u) => `${u.entry.match.score[u.entry.match.winner!]}:${u.entry.match.score[1 - u.entry.match.winner!]}` },
  { key: 'loser', header: 'Gegen', cell: (u) => team(u.entry, 1 - u.entry.match.winner!) },
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

  const upsets = elo
    .map((entry) => ({ entry, chance: winnerChance(entry) }))
    .filter((u): u is Upset => u.chance !== null && u.chance < UPSET_CHANCE)
    .sort((a, b) => a.chance - b.chance);
  const withFavourite = elo.filter((e) => e.match.winner !== null && Math.abs(e.chance[0] - 0.5) >= TOSS_UP_MARGIN);
  const favouriteWins = withFavourite.filter((e) => winnerChance(e)! > 0.5).length;

  const toggle = (name: string) =>
    setPicked(selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name]);

  return (
    <>
      <Section
        title={eloLabel}
        description={
          season === 'all'
            ? 'Alle Matches seit Beginn der Aufzeichnung.'
            : 'Ausschnitt dieser Season – die ELO läuft über Seasons hinweg weiter, ohne Reset. X-Achse: Matches in dieser Season.'
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

      <Section
        title="Überraschungen"
        description={
          <>
            Siege, bei denen das Siegerteam laut ELO vorher unter {fmtPct(UPSET_CHANCE)} Siegchance hatte.
            {withFavourite.length > 0 && ` Insgesamt gewinnt der Favorit ${fmtPct(favouriteWins / withFavourite.length)} der Matches (${favouriteWins} von ${withFavourite.length}).`}
          </>
        }
        flush
      >
        {upsets.length ? (
          <SortableTable columns={upsetColumns} rows={upsets} rowKey={(u) => u.entry.match.id} initialSort={{ key: 'chance', desc: false }} />
        ) : (
          <Empty>Keine Überraschungen in diesem Zeitraum.</Empty>
        )}
      </Section>

      <p className="text-xs text-muted-foreground">
        Berechnung: Jeder Spieler wird gegen den ELO-Schnitt des gegnerischen Teams gewertet (K = {ELO_K}, Start{' '}
        {fmtInt(ELO_START)}). Die Siegchance vergleicht den ELO-Schnitt beider Teams vor dem Match. „Alle“ nutzt eine gemeinsame Wertung über alle Teamgrößen; jede Teamgröße (2v2, 3v3, …) hat zusätzlich eine eigene.
      </p>
    </>
  );
}
