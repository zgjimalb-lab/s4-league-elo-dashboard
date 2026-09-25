import { useState } from 'react';
import { Empty, Section } from '@/components/Bits';
import { MatchCard, useEloByMatch } from '@/components/MatchCard';
import { ALL_PLAYERS, PlayerSelect } from '@/components/PlayerSelect';
import { Button } from '@/components/ui/button';
import { useScope } from '@/lib/s4/scope';
import { lineOf } from '@/lib/s4/stats';

const PAGE_SIZE = 20;

export default function MatchesPage() {
  const { matches, players } = useScope();
  const eloByMatch = useEloByMatch();
  const [player, setPlayer] = useState(ALL_PLAYERS);
  const [shown, setShown] = useState(PAGE_SIZE);

  const filtered = matches.filter((m) => player === ALL_PLAYERS || lineOf(m, player)).reverse();
  const highlight = player === ALL_PLAYERS ? undefined : player;

  return (
    <Section
      title="Match-Historie"
      description={`${filtered.length} Matches, neueste zuerst`}
      action={
        <PlayerSelect
          value={player}
          allowAll
          players={players.map((p) => p.name)}
          onChange={(p) => {
            setPlayer(p);
            setShown(PAGE_SIZE);
          }}
        />
      }
    >
      {filtered.length ? (
        <div className="space-y-3">
          {filtered.slice(0, shown).map((m) => (
            <MatchCard key={m.id} match={m} elo={eloByMatch.get(m.id)} highlight={highlight} />
          ))}
          {shown < filtered.length && (
            <div className="pt-2 text-center">
              <Button variant="outline" onClick={() => setShown(shown + PAGE_SIZE)}>
                Weitere {Math.min(PAGE_SIZE, filtered.length - shown)} laden
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Empty>Keine Matches für diesen Filter.</Empty>
      )}
    </Section>
  );
}
