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