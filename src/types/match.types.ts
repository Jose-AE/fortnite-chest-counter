export interface Match {
  matchId: string; // used to skip the same match uploaded twice
  fileName: string; // from the browser File, not the parser
  playlist: string; // solo, duo, squad...
  durationSeconds: number;
  date: string;
  version: string;
  chestCountBroken: number; // yours, broken
  chestCountSearched: number; // yours, opened
  teamChestCountSearched: number; // teammates', for the "Include squad opens" option
  teamChestCountBroken: number; // teammates', for the "Include squad opens" option
}
