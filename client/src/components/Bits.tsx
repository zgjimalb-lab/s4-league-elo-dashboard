import type { ReactNode } from 'react';
import { ScopedLink } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { playerColor } from '@/lib/s4/colors';
import type { Result } from '@/lib/s4/stats';
import { cn } from '@/lib/utils';

export function PlayerDot({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block size-2.5 shrink-0 rounded-full', className)}
      style={{ backgroundColor: playerColor(name) }}
    />
  );
}

/** Spielername mit Farbpunkt; verlinkt aufs Profil. */
export function PlayerName({ name, provisional, link = true }: { name: string; provisional?: boolean; link?: boolean }) {
  const content = (
    <span className="inline-flex items-center gap-2">
      <PlayerDot name={name} />
      <span className="font-medium">{name}</span>
      {provisional && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="rounded border border-border px-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              vorläufig
            </span>
          </TooltipTrigger>
          <TooltipContent>Weniger als 10 Spiele im gewählten Zeitraum</TooltipContent>
        </Tooltip>
      )}
    </span>
  );
  return link ? (
    <ScopedLink href={`/spieler/${encodeURIComponent(name)}`} className="hover:underline">
      {content}
    </ScopedLink>
  ) : (
    content
  );
}

const RESULT_STYLE: Record<Result, { label: string; title: string; className: string }> = {
  W: { label: 'S', title: 'Sieg', className: 'bg-[#0ca30c]/20 text-[#5fd35f]' },
  L: { label: 'N', title: 'Niederlage', className: 'bg-[#d03b3b]/20 text-[#f08080]' },
  D: { label: 'U', title: 'Unentschieden', className: 'bg-muted text-muted-foreground' },
};

export function ResultBadge({ result }: { result: Result }) {
  const style = RESULT_STYLE[result];
  return (
    <span
      title={style.title}
      className={cn('inline-flex size-5 items-center justify-center rounded text-[11px] font-bold', style.className)}
    >
      {style.label}
    </span>
  );
}

export function Form({ results }: { results: Result[] }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`Form: ${results.map((r) => RESULT_STYLE[r].title).join(', ')}`}>
      {results.map((r, i) => (
        <ResultBadge key={i} result={r} />
      ))}
    </span>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="space-y-1 px-4">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

export function Section({
  title,
  description,
  action,
  children,
  flush,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  /** Inhalt ohne seitliches Padding (für Tabellen) */
  flush?: boolean;
}) {
  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </CardHeader>
      <CardContent className={cn(flush && 'px-0')}>{children}</CardContent>
    </Card>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="py-12 text-center text-sm text-muted-foreground">{children}</div>;
}

/** Wert mit Vorzeichen-Farbe; Farbe ist nie der einzige Träger (Vorzeichen steht im Text). */
export function Delta({ value, children }: { value: number; children: ReactNode }) {
  return (
    <span className={cn('tabular-nums', value > 0 ? 'text-[#5fd35f]' : value < 0 ? 'text-[#f08080]' : 'text-muted-foreground')}>
      {children}
    </span>
  );
}
