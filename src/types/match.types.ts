// A file from the last count that could not be counted, and why.
export interface Issue {
  fileName: string;
  message: string;
}

// Name and size together identify a replay file without parsing it.
export interface ReplayFile {
  fileName: string; // from the browser File, not the parser
  fileSize: number; // bytes, also from the File
}

export interface Match extends ReplayFile {
  matchId: string; // used to skip the same match uploaded twice
  playlist: string; // solo, duo, squad...
  durationSeconds: number;
  date: string;
  version: string;
  chestCountBroken: number; // yours, broken
  chestCountSearched: number; // yours, opened
  teamChestCountSearched: number; // teammates', for the "Include squad opens" option
  teamChestCountBroken: number; // teammates', for the "Include squad opens" option
}
