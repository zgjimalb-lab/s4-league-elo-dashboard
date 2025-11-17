import { useMemo, useState } from 'react';
import { FilterMode, Season } from '@/pages/Dashboard';
import { usePlayerData, getEloData, getAllPlayers, getPlayerStats } from '@/hooks/usePlayerData';
import FilterControls from './FilterControls';
import PlayerSelector from './PlayerSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface EloTabProps {
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

type SortField = 'current' | 'peak' | 'change';
type SortDirection = 'asc' | 'desc' | null;

export default function EloTab({
  filterMode,
  setFilterMode,
  selectedSeason,
  setSelectedSeason,
  selectedPlayers,
  setSelectedPlayers,
}: EloTabProps) {
  const { data, loading, error } = usePlayerData();
  const availablePlayers = useMemo(() => getAllPlayers(data), [data]);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const eloData = useMemo(() => {
    return getEloData(data, filterMode, selectedSeason);
  }, [data, filterMode, selectedSeason]);

  const playerStats = useMemo(() => {
    return getPlayerStats(data, filterMode, selectedSeason);
  }, [data, filterMode, selectedSeason]);

  const chartData = useMemo(() => {
    if (!eloData.length || !selectedPlayers.length) return [];

    // Gruppiere ELO-Daten nach Match-ID (ein Match = mehrere Spieler)
    const matchesOrdered: string[] = [];
    const seenMatches = new Set<string>();
    
    // Behalte die chronologische Reihenfolge der Matches
    eloData.forEach((record) => {
      if (!seenMatches.has(record.match_id)) {
        seenMatches.add(record.match_id);
        matchesOrdered.push(record.match_id);
      }
    });

    // Erstelle Chart-Daten mit Match-Nummer als X-Achse und Forward-Fill für fehlende Werte
    const matchData: any[] = [];
    const lastKnownElo: Record<string, number> = {};

    matchesOrdered.forEach((matchId, matchIndex) => {
      const matchRecords = eloData.filter(r => r.match_id === matchId);
      const dataPoint: any = { matchNumber: matchIndex + 1 };
      
      // Füge ELO-Werte für ausgewählte Spieler hinzu
      selectedPlayers.forEach(player => {
        const playerRecord = matchRecords.find(r => r.player_name === player);
        
        if (playerRecord) {
          // Spieler hat in diesem Match teilgenommen
          dataPoint[player] = playerRecord.player_elo_after;
          lastKnownElo[player] = playerRecord.player_elo_after;
        } else if (lastKnownElo[player] !== undefined) {
          // Forward-Fill: Verwende letzten bekannten ELO-Wert
          dataPoint[player] = lastKnownElo[player];
        }
        // Wenn noch kein Wert bekannt ist, bleibt das Feld undefined (Linie startet später)
      });
      
      matchData.push(dataPoint);
    });

    return matchData;
  }, [eloData, selectedPlayers]);

  // Sortierte Spielerliste für Tabelle
  const sortedPlayers = useMemo(() => {
    if (!sortField || !sortDirection) return selectedPlayers;

    const playersWithStats = selectedPlayers.map(player => {
      const stat = playerStats.find(s => s.player_name === player);
      return {
        name: player,
        current: stat?.ELO_current || 0,
        peak: stat?.ELO_peak || 0,
        change: stat?.ELO_change_10_matches || 0,
      };
    });

    playersWithStats.sort((a, b) => {
      let aVal = 0, bVal = 0;
      if (sortField === 'current') {
        aVal = a.current;
        bVal = b.current;
      } else if (sortField === 'peak') {
        aVal = a.peak;
        bVal = b.peak;
      } else if (sortField === 'change') {
        aVal = a.change;
        bVal = b.change;
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return playersWithStats.map(p => p.name);
  }, [selectedPlayers, playerStats, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 inline ml-1 opacity-50" />;
    if (sortDirection === 'asc') return <ArrowUp className="w-4 h-4 inline ml-1" />;
    if (sortDirection === 'desc') return <ArrowDown className="w-4 h-4 inline ml-1" />;
    return <ArrowUpDown className="w-4 h-4 inline ml-1 opacity-50" />;
  };

  // Berechne dynamische Y-Achsen-Domain
  const yAxisDomain = useMemo(() => {
    if (!chartData.length) return [0, 2000];

    let minElo = Infinity;
    let maxElo = -Infinity;

    chartData.forEach(dataPoint => {
      selectedPlayers.forEach(player => {
        const elo = dataPoint[player];
        if (elo !== undefined && elo !== null) {
          minElo = Math.min(minElo, elo);
          maxElo = Math.max(maxElo, elo);
        }
      });
    });

    // Puffer hinzufügen (100 ELO oben und unten)
    const buffer = 100;
    return [Math.floor(minElo - buffer), Math.ceil(maxElo + buffer)];
  }, [chartData, selectedPlayers]);

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
          <CardTitle>ELO-Entwicklung über Matches</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-96 flex items-center justify-center text-muted-foreground">
              Bitte wähle mindestens einen Spieler aus
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={550}>
              <LineChart 
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="rgba(255, 255, 255, 0.08)"
                  vertical={false}
                />
                <XAxis 
                  dataKey="matchNumber" 
                  label={{ 
                    value: 'Match #', 
                    position: 'insideBottom', 
                    offset: -15,
                    style: { fill: '#94a3b8', fontSize: 14 }
                  }}
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <YAxis 
                  domain={yAxisDomain}
                  label={{ 
                    value: 'ELO', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fill: '#94a3b8', fontSize: 14 }
                  }}
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(30, 41, 59, 0.95)',
                    border: '1px solid rgba(100, 116, 139, 0.3)',
                    borderRadius: '8px',
                    color: '#e2e8f0'
                  }}
                />
                <Legend 
                  wrapperStyle={{ 
                    paddingTop: '30px',
                    fontSize: '14px'
                  }}
                  iconType="line"
                />
                {selectedPlayers.map((player) => (
                  <Line
                    key={player}
                    type="monotone"
                    dataKey={player}
                    stroke={PLAYER_COLORS[player] || '#888888'}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ELO-Statistiken</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-3 px-6 font-semibold text-sm">Spieler</th>
                  <th 
                    className="text-right py-3 px-6 font-semibold text-sm cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort('current')}
                  >
                    Aktuelles ELO{getSortIcon('current')}
                  </th>
                  <th 
                    className="text-right py-3 px-6 font-semibold text-sm cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort('peak')}
                  >
                    Peak ELO{getSortIcon('peak')}
                  </th>
                  <th 
                    className="text-right py-3 px-6 font-semibold text-sm cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort('change')}
                  >
                    Änderung (10 Matches){getSortIcon('change')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((player, index) => {
                  // Hole Statistiken aus Player_Stats (basierend auf Filter)
                  const playerStat = playerStats.find((s) => s.player_name === player);
                  const currentElo = playerStat?.ELO_current || 0;
                  const peakElo = playerStat?.ELO_peak || 0;
                  const last10Change = playerStat?.ELO_change_10_matches || 0;

                  return (
                    <tr key={`elo-${index}-${player}`} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-6 font-medium text-base">{player}</td>
                      <td className="text-right py-4 px-6 text-base">{currentElo}</td>
                      <td className="text-right py-4 px-6 text-base">{peakElo}</td>
                      <td className={`text-right py-4 px-6 text-base font-semibold ${last10Change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {last10Change >= 0 ? '+' : ''}{last10Change}
                      </td>
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
