import { useState, useEffect } from 'react';
import { FilterMode, Season } from '@/pages/Dashboard';

export interface PlayerStats {
  player_name: string;
  games_played: number;
  wins: number;
  losses: number;
  winrate: number;
  total_goals: number;
  avg_goals: number;
  total_assists?: number;
  avg_assists?: number;
  total_damage: number;
  avg_damage: number;
  total_score: number;
  avg_score: number;
  avg_dps?: number;
  ELO_current?: number;
  ELO_change_10_matches?: number;
  ELO_peak?: number;
}

export interface EloRecord {
  match_id: string;
  date: string;
  player_name: string;
  team_key: string;
  opponent_team_key: string;
  match_result: string;
  team_size: string;
  player_elo_before: number;
  player_elo_after: number;
  elo_change: number;
}

export interface DashboardData {
  Player_Stats_All_Time: PlayerStats[];
  Player_Stats_All_Time_2v2: PlayerStats[];
  Player_Stats_All_Time_3v3: PlayerStats[];
  Player_Stats_S1_2v2: PlayerStats[];
  Player_Stats_S2_2v2: PlayerStats[];
  Player_Stats_S1_3v3: PlayerStats[];
  Player_Stats_S2_3v3: PlayerStats[];
  Elo_Player_All: EloRecord[];
}

export function usePlayerData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data.json')
      .then((res) => res.json())
      .then((jsonData) => {
        // Parse numerische Felder: Konvertiere Strings mit Kommas zu Zahlen
        // Helper function to parse number strings
        const parseNum = (val: any): number => {
          if (val === null || val === undefined || val === '') return 0;
          return parseFloat(String(val).replace(/,/g, '').replace(/%/g, ''));
        };

        // Parse ELO-Daten
        if (jsonData.Elo_Player_All) {
          jsonData.Elo_Player_All = jsonData.Elo_Player_All.map((record: any) => ({
            ...record,
            player_elo_before: parseNum(record.player_elo_before),
            player_elo_after: parseNum(record.player_elo_after),
            elo_change: parseNum(record.elo_change),
          }));
        }

        // Parse Player Stats (alle Sheets)
        const statsSheets = [
          'Player_Stats_All_Time',
          'Player_Stats_All_Time_2v2',
          'Player_Stats_All_Time_3v3',
          'Player_Stats_S1_2v2',
          'Player_Stats_S2_2v2',
          'Player_Stats_S1_3v3',
          'Player_Stats_S2_3v3',
        ];

        statsSheets.forEach(sheetName => {
          if (jsonData[sheetName]) {
            jsonData[sheetName] = jsonData[sheetName].map((record: any) => ({
              ...record,
              games_played: parseNum(record.games_played),
              wins: parseNum(record.wins),
              losses: parseNum(record.losses),
              winrate: parseNum(record.winrate),
              total_goals: parseNum(record.total_goals),
              avg_goals: parseNum(record.avg_goals),
              total_assists: parseNum(record.total_assists),
              avg_assists: parseNum(record.avg_assists),
              total_damage: parseNum(record.total_damage),
              avg_damage: parseNum(record.avg_damage),
              total_score: parseNum(record.total_score),
              avg_score: parseNum(record.avg_score),
              avg_dps: parseNum(record.avg_dps),
              ELO_current: parseNum(record.ELO_current),
              ELO_change_10_matches: parseNum(record.ELO_change_10_matches),
              ELO_peak: parseNum(record.ELO_peak),
            }));
          }
        });
        setData(jsonData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { data, loading, error };
}

export function getPlayerStats(
  data: DashboardData | null,
  filterMode: FilterMode,
  selectedSeason?: Season,
  teamSize?: '2v2' | '3v3'
): PlayerStats[] {
  if (!data) return [];

  let stats: PlayerStats[] = [];

  if (filterMode === 'all-time') {
    stats = data.Player_Stats_All_Time;
  } else if (filterMode === '2v2') {
    stats = data.Player_Stats_All_Time_2v2;
  } else if (filterMode === '3v3') {
    stats = data.Player_Stats_All_Time_3v3;
  } else if (filterMode === 'season' && selectedSeason) {
    if (teamSize === '2v2') {
      stats = selectedSeason === 'S1' ? data.Player_Stats_S1_2v2 : data.Player_Stats_S2_2v2;
    } else if (teamSize === '3v3') {
      stats = selectedSeason === 'S1' ? data.Player_Stats_S1_3v3 : data.Player_Stats_S2_3v3;
    } else {
      // Wenn kein teamSize angegeben, kombiniere beide
      const s2v2 = selectedSeason === 'S1' ? data.Player_Stats_S1_2v2 : data.Player_Stats_S2_2v2;
      const s3v3 = selectedSeason === 'S1' ? data.Player_Stats_S1_3v3 : data.Player_Stats_S2_3v3;
      stats = [...s2v2, ...s3v3];
    }
  }

  return stats.filter((s) => s.player_name); // Nur Einträge mit Namen
}

export function getEloData(
  data: DashboardData | null,
  filterMode: FilterMode,
  selectedSeason?: Season
): EloRecord[] {
  if (!data || !data.Elo_Player_All) return [];

  let eloData = data.Elo_Player_All;

  // Filter nach Team-Größe
  if (filterMode === '2v2') {
    eloData = eloData.filter((record) => record.team_size === '2v2');
  } else if (filterMode === '3v3') {
    eloData = eloData.filter((record) => record.team_size === '3v3');
  }

  // TODO: Season-Filter für ELO implementieren wenn Datum-Informationen vorhanden

  return eloData;
}

export function getAllPlayers(data: DashboardData | null): string[] {
  if (!data) return [];

  const players = new Set<string>();
  data.Player_Stats_All_Time.forEach((stat) => {
    if (stat.player_name) players.add(stat.player_name);
  });

  return Array.from(players).sort();
}
