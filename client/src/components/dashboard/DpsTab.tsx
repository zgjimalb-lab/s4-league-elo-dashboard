import { useMemo } from 'react';
import { FilterMode, Season } from '@/pages/Dashboard';
import { usePlayerData, getPlayerStats, getAllPlayers } from '@/hooks/usePlayerData';
import FilterControls from './FilterControls';
import PlayerSelector from './PlayerSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface DpsTabProps {
  filterMode: FilterMode;
  setFilterMode: (mode: FilterMode) => void;
  selectedSeason: Season;
  setSelectedSeason: (season: Season) => void;
  selectedPlayers: string[];
  setSelectedPlayers: (players: string[]) => void;
}

const PLAYER_COLORS: Record<string, string> = {
  'Aferdita': '#8b5cf6',
  'Anbuu': '#3b82f6',
  'Kesny': '#10b981',
  'Malena': '#f59e0b',
  'Nebus.': '#ef4444',
  'Tess1509': '#ec4899',
  'Troniix': '#14b8a6',
  'ZeroO': '#6366f1',
};

export default function DpsTab({
  filterMode,
  setFilterMode,
  selectedSeason,
  setSelectedSeason,
  selectedPlayers,
  setSelectedPlayers,
}: DpsTabProps) {
  const { data, loading, error } = usePlayerData();
  const availablePlayers = useMemo(() => getAllPlayers(data), [data]);

  const playerStats = useMemo(() => {
    return getPlayerStats(data, filterMode, selectedSeason);
  }, [data, filterMode, selectedSeason]);

  const chartData = useMemo(() => {
    if (!selectedPlayers.length) return [];

    return playerStats
      .filter((stat) => selectedPlayers.includes(stat.player_name) && stat.avg_dps)
      .map((stat) => ({
        player: stat.player_name,
        avgDps: parseFloat((stat.avg_dps || 0).toFixed(2)),
      }))
      .sort((a, b) => b.avgDps - a.avgDps);
  }, [playerStats, selectedPlayers]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Fehler beim Laden der Daten</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <FilterControls
        filterMode={filterMode}
        setFilterMode={setFilterMode}
        selectedSeason={selectedSeason}
        setSelectedSeason={setSelectedSeason}
      />

      <PlayerSelector
        selectedPlayers={selectedPlayers}
        setSelectedPlayers={setSelectedPlayers}
        availablePlayers={availablePlayers}
      />

      <Card>
        <CardHeader>
          <CardTitle>Durchschnittlicher DPS pro Match</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-96 flex items-center justify-center text-muted-foreground">
              Bitte wähle mindestens einen Spieler aus
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="player" />
                <YAxis 
                  label={{ value: 'Avg DPS', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgDps" name="Avg DPS" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PLAYER_COLORS[entry.player] || '#888888'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>DPS-Statistiken</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-3 px-6 font-semibold text-sm">Spieler</th>
                  <th className="text-right py-3 px-6 font-semibold text-sm">Spiele</th>
                  <th className="text-right py-3 px-6 font-semibold text-sm">Avg DPS</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((item, index) => {
                  const stat = playerStats.find((s) => s.player_name === item.player);
                  if (!stat) return null;

                  return (
                    <tr key={`dps-${index}-${item.player}`} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-6 font-medium text-base">{item.player}</td>
                      <td className="text-right py-4 px-6 text-base">{stat.games_played}</td>
                      <td className="text-right py-4 px-6 text-base font-semibold">{item.avgDps.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
