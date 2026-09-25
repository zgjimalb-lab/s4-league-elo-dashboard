import { ThumbsDown, ThumbsUp, Target, Trophy } from 'lucide-react';
import type { ReactNode } from 'react';
import { Section } from '@/components/Bits';
import { fmtDate } from '@/lib/format';

/** Format von data/analyses/season-<N>.json – erzeugt nach analysis/PROMPT.md */
interface Point {
  title: string;
  evidence: string;
}
export interface Analysis {
  nickname: string;
  headline: string;
  summary: string;
  archetype: { label: string; explanation: string };
  strengths: Point[];
  weaknesses: Point[];
  development: string;
  modes: string;
  clutch: string;
  consistency: string;
  teamRole: string;
  chemistry: { bestPartner: string; nemesis: string | null };
  tips: string[];
}
interface SeasonAnalyses {
  season: number;
  createdAt: string;
  range: { from: string; to: string; matches: number };
  players: Record<string, Analysis>;
}

const files = import.meta.glob<SeasonAnalyses>('@data/analyses/season-*.json', { eager: true, import: 'default' });
const ANALYSES = Object.values(files).sort((a, b) => b.season - a.season);

/** Analyse der gewählten Season, sonst die neueste, die es für den Spieler gibt. */
export function findAnalysis(player: string, season: number | 'all') {
  const candidates = ANALYSES.filter((a) => a.players[player]);
  const pick = candidates.find((a) => a.season === season) ?? candidates[0];
  return pick ? { meta: pick, analysis: pick.players[player] } : null;
}

function Points({ items, icon, tone }: { items: Point[]; icon: ReactNode; tone: string }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.title} className="flex gap-3">
          <span className={`mt-0.5 shrink-0 ${tone}`}>{icon}</span>
          <div>
            <div className="font-medium">{item.title}</div>
            <p className="text-sm text-muted-foreground">{item.evidence}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

const DETAILS: { key: keyof Pick<Analysis, 'development' | 'modes' | 'clutch' | 'consistency' | 'teamRole'>; label: string }[] = [
  { key: 'development', label: 'Entwicklung' },
  { key: 'modes', label: '2v2 vs. 3v3' },
  { key: 'clutch', label: 'Knappe Spiele' },
  { key: 'consistency', label: 'Konstanz' },
  { key: 'teamRole', label: 'Rolle im Team' },
];

export function PlayerAnalysis({ player, season }: { player: string; season: number | 'all' }) {
  const found = findAnalysis(player, season);
  if (!found) return null;
  const { meta, analysis: a } = found;

  return (
    <Section
      title={
        <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-2">
            <Trophy className="size-4 text-[#c98500]" aria-hidden />
            Performance-Analyse · Season {meta.season}
          </span>
          <span className="rounded-full border border-[#c98500]/40 bg-[#c98500]/10 px-3 py-0.5 text-sm font-medium text-[#e0b04a]">
            „{a.nickname}“
          </span>
        </span>
      }
      description={`${fmtDate(meta.range.from)} – ${fmtDate(meta.range.to)} · ${meta.range.matches} Matches`}
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">{a.headline}</h3>
          <p className="text-muted-foreground">{a.summary}</p>
          <p className="text-sm">
            <span className="mr-2 rounded-md border border-border bg-secondary px-2 py-0.5 font-medium">{a.archetype.label}</span>
            <span className="text-muted-foreground">{a.archetype.explanation}</span>
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Stärken</h4>
            <Points items={a.strengths} icon={<ThumbsUp className="size-4" aria-label="Stärke" />} tone="text-[#5fd35f]" />
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Schwächen</h4>
            <Points items={a.weaknesses} icon={<ThumbsDown className="size-4" aria-label="Schwäche" />} tone="text-[#f08080]" />
          </div>
        </div>

        <dl className="grid gap-x-6 gap-y-4 border-t border-border pt-5 md:grid-cols-2">
          {DETAILS.map((d) => (
            <div key={d.key}>
              <dt className="text-sm font-medium">{d.label}</dt>
              <dd className="text-sm text-muted-foreground">{a[d.key]}</dd>
            </div>
          ))}
          <div>
            <dt className="text-sm font-medium">Mitspieler & Gegner</dt>
            <dd className="text-sm text-muted-foreground">
              {a.chemistry.bestPartner} {a.chemistry.nemesis}
            </dd>
          </div>
        </dl>

        <div className="rounded-lg border border-border bg-secondary/40 p-4">
          <h4 className="mb-2 inline-flex items-center gap-2 text-sm font-semibold">
            <Target className="size-4" aria-hidden /> Tipps für die nächste Season
          </h4>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            {a.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ol>
        </div>

      </div>
    </Section>
  );
}
