import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePlayerData } from '@/hooks/usePlayerData';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface TeamStats {
  team_key: string;
  games_played: number;
  wins: number;
  losses: number;
  winrate: number;
  avg_team_goals: number;
  avg_team_score: number;
}

export default function TeamsTab() {
  const { data, loading, error } = usePlayerData();
  const [teamSize, setTeamSize] = useState<'2v2' | '3v3'>('2v2');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Performance</CardTitle>
          <CardDescription>Lade Team-Statistiken...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Performance</CardTitle>
          <CardDescription className="text-destructive">
            Fehler beim Laden: {error}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Hole Team-Daten basierend auf Team-Größe
  const teamStats: TeamStats[] = teamSize === '2v2' 
    ? (data?.Team_Stats_All_Time_2v2 || [])
    : (data?.Team_Stats_All_Time_3v3 || []);

  // Sortiere nach Winrate (absteigend)
  const sortedTeams = [...teamStats].sort((a, b) => b.winrate - a.winrate);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Performance</CardTitle>
        <CardDescription>
          Statistiken aller Teams nach Spielmodus
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Team Size Filter */}
        <div className="flex gap-2">
          <Button
            variant={teamSize === '2v2' ? 'default' : 'outline'}
            onClick={() => setTeamSize('2v2')}
          >
            2v2
          </Button>
          <Button
            variant={teamSize === '3v3' ? 'default' : 'outline'}
            onClick={() => setTeamSize('3v3')}
          >
            3v3
          </Button>
        </div>

        {/* Team Stats Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rang</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="text-right">Spiele</TableHead>
                <TableHead className="text-right">Siege</TableHead>
                <TableHead className="text-right">Niederlagen</TableHead>
                <TableHead className="text-right">Winrate</TableHead>
                <TableHead className="text-right">Ø Goals</TableHead>
                <TableHead className="text-right">Ø Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTeams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Keine Team-Daten verfügbar
                  </TableCell>
                </TableRow>
              ) : (
                sortedTeams.map((team, index) => (
                  <TableRow key={team.team_key}>
                    <TableCell className="font-medium">#{index + 1}</TableCell>
                    <TableCell className="font-semibold">{team.team_key}</TableCell>
                    <TableCell className="text-right">{Math.floor(team.games_played)}</TableCell>
                    <TableCell className="text-right text-green-600">{Math.floor(team.wins)}</TableCell>
                    <TableCell className="text-right text-red-600">{Math.floor(team.losses)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {team.winrate.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">{team.avg_team_goals.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{team.avg_team_score.toFixed(0)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 border rounded-lg">
            <div className="text-sm text-muted-foreground">Teams</div>
            <div className="text-2xl font-bold">{sortedTeams.length}</div>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="text-sm text-muted-foreground">Gesamt Spiele</div>
            <div className="text-2xl font-bold">
              {sortedTeams.reduce((sum, t) => sum + Math.floor(t.games_played), 0)}
            </div>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="text-sm text-muted-foreground">Beste Winrate</div>
            <div className="text-2xl font-bold text-green-600">
              {sortedTeams.length > 0 ? sortedTeams[0].winrate.toFixed(1) : 0}%
            </div>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="text-sm text-muted-foreground">Ø Goals (Alle)</div>
            <div className="text-2xl font-bold">
              {sortedTeams.length > 0
                ? (sortedTeams.reduce((sum, t) => sum + t.avg_team_goals, 0) / sortedTeams.length).toFixed(2)
                : 0}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
