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

// Matches counted on earlier visits.
export const loadMatches = () =>
  read(MATCHES_KEY).filter(
    (m): m is Match =>
      isReplayFile(m) &&
      typeof (m as Match).matchId === "string" &&
      typeof (m as Match).playlist === "string" &&
      typeof (m as Match).date === "string",
  );

export const saveMatches = (matches: Match[]) => write(MATCHES_KEY, matches);

// Replays that hit the time limit, so they are not tried again on every upload.
export const loadTimedOut = () => read(TIMED_OUT_KEY).filter(isReplayFile);

export const saveTimedOut = (files: ReplayFile[]) =>
  write(TIMED_OUT_KEY, files);
