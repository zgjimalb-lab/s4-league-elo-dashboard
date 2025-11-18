import { useMemo } from 'react';
import { FilterMode, Season } from '@/pages/Dashboard';
import { usePlayerData, getPlayerStats, getAllPlayers } from '@/hooks/usePlayerData';
import FilterControls from './FilterControls';
import PlayerSelector from './PlayerSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface WinrateTabProps {
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

export default function WinrateTab({
  filterMode,
  setFilterMode,
  selectedSeason,
  setSelectedSeason,
  selectedPlayers,
  setSelectedPlayers,
}: WinrateTabProps) {
  const { data, loading, error } = usePlayerData();
  const availablePlayers = useMemo(() => getAllPlayers(data), [data]);

  // Hole aggregierte Player Stats (vermeidet Duplikate)
  const rawPlayerStats = useMemo(() => {
    return getPlayerStats(data, filterMode, selectedSeason);
  }, [data, filterMode, selectedSeason]);

  // Aggregiere Stats pro Spieler (falls Duplikate durch 2v2+3v3 Kombination)
  const playerStats = useMemo(() => {
    if (!rawPlayerStats.length) return [];

    // Gruppiere nach Spielername und summiere Werte
    const playerMap = new Map<string, { games: number; wins: number; losses: number }>();

    rawPlayerStats.forEach((stat) => {
      const player = stat.player_name;
      if (!playerMap.has(player)) {
        playerMap.set(player, { games: 0, wins: 0, losses: 0 });
      }
      
      const aggregated = playerMap.get(player)!;
      aggregated.games += stat.games_played || 0;
      aggregated.wins += stat.wins || 0;
      aggregated.losses += stat.losses || 0;
    });

    // Konvertiere Map zu Array mit berechneten Werten
    return Array.from(playerMap.entries()).map(([player, stats]) => ({
      player,
      games: stats.games,
      wins: stats.wins,
      losses: stats.losses,
      winrate: stats.games > 0 ? (stats.wins / stats.games) * 100 : 0,
    }));
  }, [rawPlayerStats]);

  const chartData = useMemo(() => {
    if (!selectedPlayers.length) return [];

    return playerStats
      .filter((stat) => selectedPlayers.includes(stat.player))
      .map((stat) => ({
        player: stat.player,
        winrate: stat.winrate.toFixed(1),
        winrateNum: stat.winrate,
        games: stat.games,
        wins: stat.wins,
        losses: stat.losses,
      }))
      .sort((a, b) => {
        // Sortiere nach Winrate (absteigend), bei Gleichstand nach Spielen (mehr zuerst)
        if (Math.abs(b.winrateNum - a.winrateNum) < 0.01) {
          return b.games - a.games;
        }
        return b.winrateNum - a.winrateNum;
      });
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
          <CardTitle>Winrate Vergleich</CardTitle>
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
                  label={{ value: 'Winrate (%)', angle: -90, position: 'insideLeft' }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  formatter={(value: number) => `${value}%`}
                />
                <Legend />
                <Bar dataKey="winrateNum" name="Winrate" radius={[8, 8, 0, 0]}>
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
          <CardTitle>Winrate-Statistiken</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-3 px-6 font-semibold text-sm">Spieler</th>
                  <th className="text-right py-3 px-6 font-semibold text-sm">Spiele</th>
                  <th className="text-right py-3 px-6 font-semibold text-sm">Siege</th>
                  <th className="text-right py-3 px-6 font-semibold text-sm">Niederlagen</th>
                  <th className="text-right py-3 px-6 font-semibold text-sm">Winrate</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((item, index) => (
                  <tr key={`winrate-${index}-${item.player}`} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6 font-medium text-base">{item.player}</td>
                    <td className="text-right py-4 px-6 text-base">{Math.floor(item.games)}</td>
                    <td className="text-right py-4 px-6 text-base text-green-500">{Math.floor(item.wins)}</td>
                    <td className="text-right py-4 px-6 text-base text-red-500">{Math.floor(item.losses)}</td>
                    <td className="text-right py-4 px-6 text-base font-semibold">{item.winrate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
