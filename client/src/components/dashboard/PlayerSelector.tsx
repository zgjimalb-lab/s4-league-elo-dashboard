import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';

interface PlayerSelectorProps {
  selectedPlayers: string[];
  setSelectedPlayers: (players: string[]) => void;
  availablePlayers: string[];
}

export default function PlayerSelector({
  selectedPlayers,
  setSelectedPlayers,
  availablePlayers,
}: PlayerSelectorProps) {
  const togglePlayer = (player: string) => {
    if (selectedPlayers.includes(player)) {
      setSelectedPlayers(selectedPlayers.filter((p) => p !== player));
    } else {
      setSelectedPlayers([...selectedPlayers, player]);
    }
  };

  const selectAll = () => {
    setSelectedPlayers(availablePlayers);
  };

  const deselectAll = () => {
    setSelectedPlayers([]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Spielerauswahl</CardTitle>
        <div className="flex gap-2 mt-2">
          <button
            onClick={selectAll}
            className="text-sm text-primary hover:underline"
          >
            Alle auswählen
          </button>
          <span className="text-muted-foreground">|</span>
          <button
            onClick={deselectAll}
            className="text-sm text-primary hover:underline"
          >
            Alle abwählen
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {availablePlayers.map((player) => {
            const isSelected = selectedPlayers.includes(player);
            return (
              <Button
                key={player}
                onClick={() => togglePlayer(player)}
                variant={isSelected ? "default" : "outline"}
                size="lg"
                className="relative"
              >
                {isSelected && (
                  <Check className="w-4 h-4 mr-2" />
                )}
                {player}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
