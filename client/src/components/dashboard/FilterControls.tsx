import { Button } from '@/components/ui/button';
import { FilterMode, Season } from '@/pages/Dashboard';

interface FilterControlsProps {
  filterMode: FilterMode;
  setFilterMode: (mode: FilterMode) => void;
  selectedSeason?: Season;
  setSelectedSeason?: (season: Season) => void;
}

export default function FilterControls({
  filterMode,
  setFilterMode,
  selectedSeason,
  setSelectedSeason,
}: FilterControlsProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <div className="flex gap-2">
        <Button
          variant={filterMode === 'all-time' ? 'default' : 'outline'}
          onClick={() => setFilterMode('all-time')}
          size="sm"
        >
          All-Time
        </Button>
        <Button
          variant={filterMode === '2v2' ? 'default' : 'outline'}
          onClick={() => setFilterMode('2v2')}
          size="sm"
        >
          2v2 Only
        </Button>
        <Button
          variant={filterMode === '3v3' ? 'default' : 'outline'}
          onClick={() => setFilterMode('3v3')}
          size="sm"
        >
          3v3 Only
        </Button>
        <Button
          variant={filterMode === 'season' ? 'default' : 'outline'}
          onClick={() => setFilterMode('season')}
          size="sm"
        >
          By Season
        </Button>
      </div>

      {filterMode === 'season' && setSelectedSeason && (
        <div className="flex gap-2 ml-4">
          <Button
            variant={selectedSeason === 'S1' ? 'default' : 'outline'}
            onClick={() => setSelectedSeason('S1')}
            size="sm"
          >
            Season 1
          </Button>
          <Button
            variant={selectedSeason === 'S2' ? 'default' : 'outline'}
            onClick={() => setSelectedSeason('S2')}
            size="sm"
          >
            Season 2
          </Button>
        </div>
      )}
    </div>
  );
}
