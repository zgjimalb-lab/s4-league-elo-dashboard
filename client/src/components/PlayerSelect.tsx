import { PlayerDot } from '@/components/Bits';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const ALL_PLAYERS = '__all__';

export function PlayerSelect({
  value,
  onChange,
  players,
  allowAll,
  label = 'Spieler',
}: {
  value: string;
  onChange: (name: string) => void;
  players: string[];
  allowAll?: boolean;
  label?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-52" aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value={ALL_PLAYERS}>Alle Spieler</SelectItem>}
        {players.map((p) => (
          <SelectItem key={p} value={p}>
            <span className="inline-flex items-center gap-2">
              <PlayerDot name={p} />
              {p}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
