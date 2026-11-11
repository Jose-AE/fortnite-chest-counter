// A file from the last count that could not be counted, and why.
export interface Issue {
  fileName: string;
  message: string;
}

export interface Match {
  matchId: string; // used to skip the same match uploaded twice
  fileName: string; // from the browser File, not the parser
  fileSize: number; // bytes, also from the File; name + size spot an already scanned file without parsing it
  playlist: string; // solo, duo, squad...
  durationSeconds: number;
  date: string;
  version: string;
  chestCountBroken: number; // yours, broken
  chestCountSearched: number; // yours, opened
  teamChestCountSearched: number; // teammates', for the "Include squad opens" option
  teamChestCountBroken: number; // teammates', for the "Include squad opens" option
}
