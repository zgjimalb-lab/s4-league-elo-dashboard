import { useMemo } from 'react';
import {
  Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { PlayerDot } from '@/components/Bits';
import { fmtDate, fmtInt } from '@/lib/format';
import { ACCENT, playerColor } from '@/lib/s4/colors';
import { ELO_START, type EloEntry } from '@/lib/s4/elo';

const AXIS = { stroke: 'var(--border)', tick: { fill: 'var(--muted-foreground)', fontSize: 12 } } as const;
const GRID = 'rgba(148, 163, 184, 0.12)';
const SURFACE = 'var(--card)';

function TooltipBox({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm shadow-lg">{children}</div>;
}

// ---------------------------------------------------------------------------
// ELO-Verlauf
// ---------------------------------------------------------------------------

interface EloPoint {
  index: number;
  date: string;
  [player: string]: number | string | undefined;
}

export function EloChart({ entries, players, height = 420 }: { entries: EloEntry[]; players: string[]; height?: number }) {
  const data = useMemo(() => {
    const last: Record<string, number> = {};
    const points: EloPoint[] = [{ index: 0, date: entries[0]?.match.date ?? '' }];
    entries.forEach((entry, i) => {
      const point: EloPoint = { index: i + 1, date: entry.match.date };
      for (const player of players) {
        const change = entry.changes.get(player);
        if (change) {
          // Startwert am Punkt davor eintragen, damit die Linie beim ersten Match beginnt
          if (last[player] === undefined) points[points.length - 1][player] = change.before;
          last[player] = change.after;
        }
        if (last[player] !== undefined) point[player] = last[player];
      }
      points.push(point);
    });
    return points;
  }, [entries, players]);

  const ticks = useMemo(() => {
    const values = data.flatMap((point) => players.map((p) => point[p]).filter((v): v is number => typeof v === 'number'));
    if (!values.length) return [ELO_START];
    const span = Math.max(...values) - Math.min(...values);
    const step = span > 300 ? 100 : span > 120 ? 50 : 25;
    const low = Math.floor((Math.min(...values) - 5) / step) * step;
    const high = Math.ceil((Math.max(...values) + 5) / step) * step;
    return Array.from({ length: (high - low) / step + 1 }, (_, i) => low + i * step);
  }, [data, players]);

  if (!entries.length || !players.length) return null;

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="index" {...AXIS} tickLine={false} minTickGap={32} />
          <YAxis {...AXIS} tickLine={false} axisLine={false} width={48} ticks={ticks}
            domain={[ticks[0], ticks[ticks.length - 1]]} tickFormatter={(v: number) => fmtInt(v)} />
          <ReferenceLine y={ELO_START} stroke="rgba(148, 163, 184, 0.35)" />
          <Tooltip
            cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as EloPoint;
              const rows = payload
                .filter((p) => typeof p.value === 'number')
                .sort((a, b) => (b.value as number) - (a.value as number));
              return (
                <TooltipBox>
                  <div className="mb-1 text-xs text-muted-foreground">
                    Match {point.index}{point.date && ` · ${fmtDate(point.date)}`}
                  </div>
                  {rows.map((p) => (
                    <div key={String(p.dataKey)} className="flex items-center justify-between gap-4">
                      <span className="inline-flex items-center gap-2"><PlayerDot name={String(p.dataKey)} />{p.dataKey}</span>
                      <span className="tabular-nums">{fmtInt(p.value as number)}</span>
                    </div>
                  ))}
                </TooltipBox>
              );
            }}
          />
          {players.map((player) => (
            <Line
              key={player}
              dataKey={player}
              type="linear"
              stroke={playerColor(player)}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              dot={false}
              activeDot={{ r: 4, fill: playerColor(player), stroke: SURFACE, strokeWidth: 2 }}
              isAnimationActive={false}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Legend({ players }: { players: string[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
      {players.map((p) => (
        <span key={p} className="inline-flex items-center gap-2">
          <span aria-hidden className="inline-block h-0.5 w-4 rounded" style={{ backgroundColor: playerColor(p) }} />
          {p}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Horizontales Balkendiagramm: eine Kennzahl über alle Spieler (eine Serie → eine Farbe)
// ---------------------------------------------------------------------------

export function PlayerBarChart({
  rows,
  format,
}: {
  rows: { name: string; value: number }[];
  format: (value: number) => string;
}) {
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  return (
    <div style={{ height: sorted.length * 36 + 16 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 72, bottom: 0, left: 0 }} barCategoryGap={6}>
          <CartesianGrid horizontal={false} stroke={GRID} />
          <XAxis type="number" hide domain={[0, 'dataMax']} />
          <YAxis type="category" dataKey="name" {...AXIS} tickLine={false} axisLine={false} width={128} />
          <Tooltip
            cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TooltipBox>
                  <span className="inline-flex items-center gap-2">
                    <PlayerDot name={String(payload[0].payload.name)} />
                    {payload[0].payload.name}: <span className="tabular-nums">{format(payload[0].value as number)}</span>
                  </span>
                </TooltipBox>
              ) : null
            }
          />
          <Bar dataKey="value" fill={ACCENT} maxBarSize={24} radius={[0, 4, 4, 0]} isAnimationActive={false}>
            <LabelList dataKey="value" position="right" formatter={(v: number) => format(v)}
              style={{ fill: 'var(--foreground)', fontSize: 12 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Balken um eine Nulllinie (z.B. Synergie): Vorzeichen steht immer auch im Text. */
export function DivergingBar({ value, max }: { value: number; max: number }) {
  const width = max > 0 ? Math.min(Math.abs(value) / max, 1) * 50 : 0;
  return (
    <div className="relative h-2 w-28 rounded-sm bg-muted/40" aria-hidden>
      <div className="absolute inset-y-0 left-1/2 w-px bg-muted-foreground/50" />
      <div
        className="absolute inset-y-0 rounded-sm"
        style={{
          width: `${width}%`,
          left: value >= 0 ? '50%' : `${50 - width}%`,
          backgroundColor: value >= 0 ? '#3987e5' : '#e66767',
        }}
      />
    </div>
  );
}
