import { readJson, writeJson } from "@/lib/storage";
import type { Match, ReplayFile } from "@/types/match.types";

const MATCHES_KEY = "chest-counter:matches";
const TIMED_OUT_KEY = "chest-counter:timed-out";

// A saved list, or an empty one when storage is empty, blocked or holds something else.
const readList = (key: string) => {
  const saved = readJson(key);
  return Array.isArray(saved) ? (saved as unknown[]) : [];
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
export const loadMatches = () => toMatches(readList(MATCHES_KEY));

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

export const saveMatches = (matches: Match[]) => writeJson(MATCHES_KEY, matches);

// Replays that hit the time limit, so they are not tried again on every upload.
export const loadTimedOut = () => readList(TIMED_OUT_KEY).filter(isReplayFile);

export const saveTimedOut = (files: ReplayFile[]) =>
  writeJson(TIMED_OUT_KEY, files);
