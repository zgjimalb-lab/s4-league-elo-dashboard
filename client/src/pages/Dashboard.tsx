import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import EloTab from '@/components/dashboard/EloTab';
import WinrateTab from '@/components/dashboard/WinrateTab';
import DamageTab from '@/components/dashboard/DamageTab';
import GoalsTab from '@/components/dashboard/GoalsTab';
import ScoreTab from '@/components/dashboard/ScoreTab';
import DpsTab from '@/components/dashboard/DpsTab';
import TeamsTab from '@/components/dashboard/TeamsTab';

export type FilterMode = 'all-time' | '2v2' | '3v3' | 'season';
export type Season = 'S1' | 'S2';

export default function Dashboard() {
  const [filterMode, setFilterMode] = useState<FilterMode>('all-time');
  const [selectedSeason, setSelectedSeason] = useState<Season>('S1');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">S4 League Player Statistics</h1>
        <p className="text-muted-foreground">
          Analyse der Spielerperformance über alle Matches
        </p>
      </div>

      <Tabs defaultValue="elo" className="w-full">
        <TabsList className="grid w-full grid-cols-6 mb-6">
          <TabsTrigger value="elo">ELO</TabsTrigger>
          <TabsTrigger value="winrate">Winrate</TabsTrigger>
          <TabsTrigger value="score">Score</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="damage">Damage</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>

        <TabsContent value="elo">
          <EloTab
            filterMode={filterMode}
            setFilterMode={setFilterMode}
            selectedSeason={selectedSeason}
            setSelectedSeason={setSelectedSeason}
            selectedPlayers={selectedPlayers}
            setSelectedPlayers={setSelectedPlayers}
          />
        </TabsContent>

        <TabsContent value="winrate">
          <WinrateTab
            filterMode={filterMode}
            setFilterMode={setFilterMode}
            selectedSeason={selectedSeason}
            setSelectedSeason={setSelectedSeason}
            selectedPlayers={selectedPlayers}
            setSelectedPlayers={setSelectedPlayers}
          />
        </TabsContent>

        <TabsContent value="score">
          <ScoreTab
            filterMode={filterMode}
            setFilterMode={setFilterMode}
            selectedSeason={selectedSeason}
            setSelectedSeason={setSelectedSeason}
            selectedPlayers={selectedPlayers}
            setSelectedPlayers={setSelectedPlayers}
          />
        </TabsContent>

        <TabsContent value="goals">
          <GoalsTab
            filterMode={filterMode}
            setFilterMode={setFilterMode}
            selectedSeason={selectedSeason}
            setSelectedSeason={setSelectedSeason}
            selectedPlayers={selectedPlayers}
            setSelectedPlayers={setSelectedPlayers}
          />
        </TabsContent>

        <TabsContent value="damage">
          <DamageTab
            filterMode={filterMode}
            setFilterMode={setFilterMode}
            selectedSeason={selectedSeason}
            setSelectedSeason={setSelectedSeason}
            selectedPlayers={selectedPlayers}
            setSelectedPlayers={setSelectedPlayers}
          />
        </TabsContent>

        <TabsContent value="dps">
          <DpsTab
            filterMode={filterMode}
            setFilterMode={setFilterMode}
            selectedSeason={selectedSeason}
            setSelectedSeason={setSelectedSeason}
            selectedPlayers={selectedPlayers}
            setSelectedPlayers={setSelectedPlayers}
          />
        </TabsContent>

        <TabsContent value="teams">
          <TeamsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
