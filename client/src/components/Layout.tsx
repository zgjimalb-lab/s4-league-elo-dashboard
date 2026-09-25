import type { ReactNode } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { fmtDate } from '@/lib/format';
import { ALL_MATCHES, LAST_MATCH_DATE, MODES, SEASONS } from '@/lib/s4/data';
import { useScope, type ModeFilter, type SeasonFilter } from '@/lib/s4/scope';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Rangliste' },
  { href: '/elo', label: 'ELO-Verlauf' },
  { href: '/spieler', label: 'Spieler' },
  { href: '/matches', label: 'Matches' },
  { href: '/duell', label: 'Head-to-Head' },
  { href: '/duos', label: 'Duos & Teams' },
];

/** Link, der die aktuellen Filter (Season, Modus) mitnimmt. */
export function ScopedLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const search = useSearch();
  return (
    <Link href={search ? `${href}?${search}` : href} className={className}>
      {children}
    </Link>
  );
}

function FilterBar() {
  const { season, mode, setFilter } = useScope();
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Season</span>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={String(season)}
          onValueChange={(v) => v && setFilter({ season: (v === 'all' ? 'all' : Number(v)) as SeasonFilter })}
        >
          {SEASONS.map((s) => (
            <ToggleGroupItem key={s} value={String(s)} className="px-3">
              S{s}
            </ToggleGroupItem>
          ))}
          <ToggleGroupItem value="all" className="px-3">
            Alle
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Modus</span>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={mode}
          onValueChange={(v) => v && setFilter({ mode: v as ModeFilter })}
        >
          <ToggleGroupItem value="all" className="px-3">
            Alle
          </ToggleGroupItem>
          {MODES.map((m) => (
            <ToggleGroupItem key={m} value={m} className="px-3">
              {m}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const active = (href: string) => (href === '/' ? location === '/' : location.startsWith(href));

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/60">
        <div className="container py-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="text-2xl font-bold tracking-tight">S4 League · Touchdown Stats</h1>
            <p className="text-sm text-muted-foreground">
              {ALL_MATCHES.length} Matches{LAST_MATCH_DATE && ` · letztes Match ${fmtDate(LAST_MATCH_DATE)}`}
            </p>
          </div>
          <nav className="-mx-1 mt-4 flex gap-1 overflow-x-auto pb-1">
            {NAV.map((item) => (
              <ScopedLink
                key={item.href}
                href={item.href}
                className={cn(
                  'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  active(item.href) ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {item.label}
              </ScopedLink>
            ))}
          </nav>
        </div>
      </header>
      <div className="container space-y-6 py-6">
        <FilterBar />
        <main className="space-y-6">{children}</main>
      </div>
    </div>
  );
}
