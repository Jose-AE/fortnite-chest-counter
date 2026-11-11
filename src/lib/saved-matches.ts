import type { Match } from "@/types/match.types";

const KEY = "chest-counter:matches";

// Matches counted on earlier visits. Anything in storage that is not a match is dropped.
export const loadMatches = (): Match[] => {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(saved)
      ? saved.filter(
          (m) =>
            typeof m?.matchId === "string" &&
            typeof m.fileName === "string" &&
            typeof m.playlist === "string" &&
            typeof m.date === "string",
        )
      : [];
  } catch {
    return [];
  }
};

export const saveMatches = (matches: Match[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(matches));
  } catch {
    // storage is full or blocked: this visit still works, it just is not remembered
  }
};
