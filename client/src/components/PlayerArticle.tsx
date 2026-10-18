import { ArrowRight, ChevronDown, Newspaper } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Delta, Section } from '@/components/Bits';
import { Button } from '@/components/ui/button';
import { fmt2, fmtDate, fmtInt, fmtPct, fmtSigned } from '@/lib/format';
import { ALL_MATCHES } from '@/lib/s4/data';
import { computeElo } from '@/lib/s4/elo';
import { playerStats, type PlayerStats } from '@/lib/s4/stats';

/** Format von data/articles/season-<N>.json – Season-Report mit Vergleich zur Vorsaison */
interface Article {
  headline: string;
  dek: string;
  sections: { heading: string; paragraphs: string[] }[];
}
interface SeasonArticles {
  season: number;
  createdAt: string;
  /** Stand des Textes: Matches bis einschließlich `upToMatch` */
  range: { from: string; to: string; matches: number; upToMatch: number };
  players: Record<string, Article>;
}

const files = import.meta.glob<SeasonArticles>('@data/articles/season-*.json', { eager: true, import: 'default' });
const ARTICLES = Object.values(files).sort((a, b) => b.season - a.season);

/** Unter so vielen Spielen in der Vorsaison ist der Vergleich nur ein Anhaltspunkt. */
const FEW_GAMES = 15;

const COMPARE: { label: string; value: (s: PlayerStats) => number; format: (v: number) => string; delta: (d: number) => string }[] = [
  { label: 'Winrate', value: (s) => s.winrate, format: fmtPct, delta: (d) => `${d > 0 ? '+' : ''}${fmtPct(d)}` },
  { label: 'Ø Touchdowns', value: (s) => s.perGame.goals, format: fmt2, delta: (d) => `${d > 0 ? '+' : ''}${fmt2(d)}` },
  { label: 'Ø TD-Assists', value: (s) => s.perGame.assists, format: fmt2, delta: (d) => `${d > 0 ? '+' : ''}${fmt2(d)}` },
  { label: 'Ø Damage', value: (s) => s.perGame.damage, format: fmtInt, delta: fmtSigned },
  { label: 'K/D', value: (s) => s.detailed.kd, format: fmt2, delta: (d) => `${d > 0 ? '+' : ''}${fmt2(d)}` },
  { label: 'MVP-Rate', value: (s) => s.mvps / s.games, format: fmtPct, delta: (d) => `${d > 0 ? '+' : ''}${fmtPct(d)}` },
];

/** Artikel der gewählten Season; bei „alle Seasons“ der neueste. */
function findArticle(player: string, season: number | 'all') {
  const pick = season === 'all' ? ARTICLES.find((a) => a.players[player]) : ARTICLES.find((a) => a.season === season && a.players[player]);
  return pick ? { meta: pick, article: pick.players[player] } : null;
}

/** Vergleich Vorsaison → Season bis zum Stand des Artikels, unabhängig vom Filter der Seite */
function useComparison(player: string, meta: SeasonArticles | undefined) {
  return useMemo(() => {
    if (!meta) return null;
    const current = ALL_MATCHES.filter((m) => m.season === meta.season && m.number <= meta.range.upToMatch);
    const previous = ALL_MATCHES.filter((m) => m.season === meta.season - 1);
    const now = playerStats(current).find((s) => s.name === player);
    const before = playerStats(previous).find((s) => s.name === player);
    if (!now || !before) return null;
    const changes = computeElo(ALL_MATCHES.filter((m) => m.number <= meta.range.upToMatch)).entries.flatMap((e) => {
      const change = e.changes.get(player);
      return change ? [{ season: e.match.season, after: change.after }] : [];
    });
    const eloAt = (season: number) => changes.filter((c) => c.season === season).at(-1)?.after ?? null;
    return { now, before, elo: { before: eloAt(meta.season - 1), now: eloAt(meta.season) } };
  }, [player, meta]);
}

export function PlayerArticle({ player, season }: { player: string; season: number | 'all' }) {
  const found = findArticle(player, season);
  const comparison = useComparison(player, found?.meta);
  const [open, setOpen] = useState(false);
  if (!found) return null;
  const { meta, article: a } = found;
  const sections = open ? a.sections : a.sections.slice(0, 1);

  return (
    <Section
      title={
        <span className="inline-flex items-center gap-2">
          <Newspaper className="size-4 text-[#c98500]" aria-hidden />
          Season-{meta.season}-Report
        </span>
      }
      description={`Zwischenbilanz · Stand ${fmtDate(meta.range.to)} · ${meta.range.matches} Matches seit ${fmtDate(meta.range.from)}`}
    >
      <article className="space-y-6">
        <header className="space-y-3">
          <h3 className="text-2xl font-semibold leading-tight text-balance">{a.headline}</h3>
          <p className="text-lg text-muted-foreground">{a.dek}</p>
        </header>

        {comparison && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span className="font-semibold uppercase tracking-wide text-muted-foreground">
                Season {meta.season - 1} <ArrowRight className="inline size-3.5" aria-label="zu" /> Season {meta.season}
              </span>
              <span className="text-muted-foreground">
                {comparison.before.games} → {comparison.now.games} Spiele
                {comparison.before.games < FEW_GAMES && ` · Season ${meta.season - 1} nur mit wenigen Spielen`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {COMPARE.map((c) => {
                const before = c.value(comparison.before);
                const now = c.value(comparison.now);
                return (
                  <div key={c.label} className="rounded-lg border border-border bg-secondary/30 px-3 py-2">
                    <div className="text-xs text-muted-foreground">{c.label}</div>
                    <div className="mt-0.5 text-lg font-semibold tabular-nums">{c.format(now)}</div>
                    <div className="text-xs tabular-nums text-muted-foreground">
                      vorher {c.format(before)} ·{' '}
                      <span className="whitespace-nowrap">
                        <Delta value={now - before}>{c.delta(now - before)}</Delta>
                      </span>
                    </div>
                  </div>
                );
              })}
              {comparison.elo.before !== null && comparison.elo.now !== null && (
                <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2">
                  <div className="text-xs text-muted-foreground">ELO</div>
                  <div className="mt-0.5 text-lg font-semibold tabular-nums">{fmtInt(comparison.elo.now)}</div>
                  <div className="text-xs tabular-nums text-muted-foreground">
                    Ende S{meta.season - 1} {fmtInt(comparison.elo.before)} ·{' '}
                    <Delta value={comparison.elo.now - comparison.elo.before}>{fmtSigned(comparison.elo.now - comparison.elo.before)}</Delta>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="max-w-3xl space-y-6">
          {sections.map((section) => (
            <section key={section.heading} className="space-y-2">
              <h4 className="text-base font-semibold">{section.heading}</h4>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="leading-relaxed text-muted-foreground">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>

        {a.sections.length > 1 && (
          <Button variant="outline" size="sm" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? 'Weniger anzeigen' : `Ganzen Artikel lesen (${a.sections.length - 1} weitere Abschnitte)`}
            <ChevronDown className={open ? 'rotate-180 transition-transform' : 'transition-transform'} aria-hidden />
          </Button>
        )}
      </article>
    </Section>
  );
}
