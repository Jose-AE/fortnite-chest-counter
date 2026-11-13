import type { Match, ReplayFile } from "@/types/match.types";

const MATCHES_KEY = "chest-counter:matches";
const TIMED_OUT_KEY = "chest-counter:timed-out";

// A saved list, or an empty one when storage is empty, blocked or holds something else.
const read = (key: string): unknown[] => {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage is full or blocked: this visit still works, it just is not remembered
  }
};

const isReplayFile = (f: unknown): f is ReplayFile =>
  typeof (f as ReplayFile)?.fileName === "string" &&
  typeof (f as ReplayFile).fileSize === "number";

const COUNTS = [
  "chestCountBroken",
  "chestCountSearched",
  "teamChestCountSearched",
  "teamChestCountBroken",
] as const;

// The entries of a list that are matches; also checks imported files, so the counts must be real numbers.
export const toMatches = (list: unknown[]) =>
  list.filter(
    (m): m is Match =>
      isReplayFile(m) &&
      typeof (m as Match).matchId === "string" &&
      typeof (m as Match).playlist === "string" &&
      typeof (m as Match).date === "string" &&
      COUNTS.every((k) => Number.isFinite((m as Match)[k])),
  );

// Matches counted on earlier visits.
export const loadMatches = () => toMatches(read(MATCHES_KEY));

// The saved matches plus the ones in `incoming` that are not already saved.
export const mergeMatches = (saved: Match[], incoming: Match[]) => {
  const all = [...saved];
  for (const m of incoming) {
    const dupe = all.some((s) =>
      m.matchId
        ? s.matchId === m.matchId
        : s.fileName === m.fileName && s.fileSize === m.fileSize,
    );
    if (!dupe) all.push(m);
  }
  return all;
};

export const saveMatches = (matches: Match[]) => write(MATCHES_KEY, matches);

// Replays that hit the time limit, so they are not tried again on every upload.
export const loadTimedOut = () => read(TIMED_OUT_KEY).filter(isReplayFile);

export const saveTimedOut = (files: ReplayFile[]) =>
  write(TIMED_OUT_KEY, files);
