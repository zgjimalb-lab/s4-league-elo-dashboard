/** Format von data/matches.json (geschrieben von scripts/sync_xero.py). */

export type TeamIndex = 0 | 1;

export interface PlayerLine {
  name: string;
  team: TeamIndex;
  /** Sekunden im Match; bei alten Sheet-Matches unbekannt */
  playtime: number | null;
  goals: number;
  /** Touchdown-Assists ("A" auf der Match-Seite) */
  assists: number;
  damage: number;
  score: number;
  // nur bei Matches aus der Xero API vorhanden:
  kills?: number;
  deaths?: number;
  killAssists?: number;
  suicides?: number;
  damageReceived?: number;
  healing?: number;
  healingReceived?: number;
  rebounds?: number;
  offense?: number;
  offenseAssists?: number;
  defense?: number;
  defenseAssists?: number;
  tags?: string[];
}

export interface StoredMatch {
  id: string;
  source: 'xero' | 'sheet';
  /** YYYY-MM-DD; bei API-Matches der Tag, an dem der Sync das Match zuerst gesehen hat */
  date: string;
  seenAt?: string;
  /** Datum nur geschätzt (Match lag vor dem Sync-Start und fehlte in der alten Auswertung) */
  dateEstimated?: boolean;
  legacyId?: string;
  map: string | null;
  durationSec: number | null;
  /** Touchdowns [Team 0, Team 1] */
  score: [number, number];
  winner: TeamIndex | null;
  players: PlayerLine[];
}

/** Teamgröße, z.B. '2v2', '3v3', '4v4' */
export type Mode = `${number}v${number}`;

/** Ein Match, das für die Statistik zählt – chronologisch nummeriert und einer Season zugeordnet. */
export interface Match extends StoredMatch {
  /** fortlaufende Nummer (1 = ältestes gezähltes Match) */
  number: number;
  mode: Mode;
  season: number;
}
