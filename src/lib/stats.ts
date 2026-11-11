import {
  formatDateTime,
  formatDay,
  formatLength,
  formatMode,
} from "@/lib/format";
import type { Match } from "@/types/match.types";

// Opened and broken are added together everywhere in the page.
export const yours = (m: Match) => m.chestCountSearched + m.chestCountBroken;
export const teammates = (m: Match) =>
  m.teamChestCountSearched + m.teamChestCountBroken;

// Every number the page shows above the match list. With includeSquad, teammates' chests count towards all of them.
export function summarize(matches: Match[], includeSquad: boolean) {
  const count = (m: Match) => yours(m) + (includeSquad ? teammates(m) : 0);
  const sum = (value: (m: Match) => number) =>
    matches.reduce((total, m) => total + value(m), 0);

  const opened = sum(yours);
  const byTeammates = sum(teammates);
  const squad = includeSquad ? byTeammates : 0;
  const total = opened + squad;
  const minutes = sum((m) => m.durationSeconds) / 60;
  const best = matches.reduce<Match | null>(
    (top, m) => (top === null || count(m) > count(top) ? m : top),
    null,
  );
  const times = matches.map((m) => Date.parse(m.date));

  return {
    matchCount: matches.length,
    opened,
    teammates: byTeammates, // always the full count, shown on its own tile
    squad, // the part of it that is in the total: all of it, or 0
    total,
    perMatch: matches.length > 0 ? total / matches.length : 0,
    perMinute: minutes > 0 ? total / minutes : 0,
    best: best && { count: count(best), date: best.date },
    from: Math.min(...times),
    to: Math.max(...times),
  };
}

export type Summary = ReturnType<typeof summarize>;

// The event's shop token: each chest, opened or broken, has a 1 in 137,500 chance to drop one.
// Both facts come from the site owner, who says Epic Games confirmed the odds; neither is read from the game.
export const TOKEN_ODDS = 137_500;

// The chance that at least one of this many chests dropped a token, as a fraction from 0 to 1.
export const tokenChance = (chests: number) =>
  1 - (1 - 1 / TOKEN_ODDS) ** chests;

// How many chests it takes for that chance to reach 50%: about 95,300, well under TOKEN_ODDS.
export const CHESTS_FOR_EVEN_CHANCE = Math.ceil(
  Math.log(0.5) / Math.log(1 - 1 / TOKEN_ODDS),
);

export type ChartGroup = "match" | "day";

// One bar of the chart: a match, or all the matches of one day.
export interface ChartBar {
  title: string; // tooltip heading
  day: string; // x-axis label, "Nov 6"
  you: number;
  squad: number; // 0 when squad opens are not included
  note: string; // tooltip footer
}

// The chart's bars, oldest first. Days are the visitor's local days.
export function chartBars(
  matches: Match[],
  includeSquad: boolean,
  group: ChartGroup,
): ChartBar[] {
  const sorted = [...matches].sort(
    (a, b) => Date.parse(a.date) - Date.parse(b.date),
  );
  const squad = (m: Match) => (includeSquad ? teammates(m) : 0);

  if (group === "match")
    return sorted.map((m) => ({
      title: formatDateTime(m.date),
      day: formatDay(m.date),
      you: yours(m),
      squad: squad(m),
      note: `${formatMode(m.playlist)}, ${formatLength(m.durationSeconds)}`,
    }));

  const days = new Map<string, { bar: ChartBar; matches: number }>();
  for (const m of sorted) {
    const key = new Date(m.date).toDateString(); // includes the year, so the same date in two years stays apart
    const entry = days.get(key) ?? {
      bar: {
        title: new Date(m.date).toLocaleDateString(undefined, {
          dateStyle: "medium",
        }),
        day: formatDay(m.date),
        you: 0,
        squad: 0,
        note: "",
      },
      matches: 0,
    };
    entry.bar.you += yours(m);
    entry.bar.squad += squad(m);
    entry.matches++;
    entry.bar.note = `${entry.matches} ${entry.matches === 1 ? "match" : "matches"}`;
    days.set(key, entry);
  }
  return [...days.values()].map((entry) => entry.bar);
}

// Self-check, dev only: two made-up matches with known answers.
if (import.meta.env.DEV) {
  const match = (you: number, team: number, seconds: number, date: string) =>
    ({
      chestCountSearched: you,
      chestCountBroken: 0,
      teamChestCountSearched: team,
      teamChestCountBroken: 0,
      durationSeconds: seconds,
      date,
      playlist: "Playlist_Test",
    }) as Match;
  const sample = [
    match(10, 5, 600, "2026-01-01T00:00:00Z"),
    match(30, 15, 600, "2026-01-02T00:00:00Z"),
  ];
  // local noon, so the two land on the same day in every time zone
  const sameDay = [
    match(1, 2, 60, new Date(2026, 0, 5, 12).toISOString()),
    match(3, 4, 60, new Date(2026, 0, 5, 13).toISOString()),
    match(5, 6, 60, new Date(2026, 0, 6, 12).toISOString()),
  ];
  const byDay = chartBars(sameDay, true, "day");
  console.assert(
    byDay.length === 2 &&
      byDay[0].you === 4 &&
      byDay[0].squad === 6 &&
      byDay[0].note === "2 matches" &&
      chartBars(sameDay, false, "match").length === 3 &&
      chartBars(sameDay, false, "day")[0].squad === 0,
    "chartBars() self-check failed",
  );
  console.assert(
    tokenChance(0) === 0 &&
      Math.abs(tokenChance(7194) - 0.05098) < 0.0001 &&
      // as many chests as the odds gives 1 - 1/e, not 100%
      Math.abs(tokenChance(TOKEN_ODDS) - 0.6321) < 0.0001,
    "tokenChance() self-check failed",
  );
  const solo = summarize(sample, false);
  const withSquad = summarize(sample, true);
  console.assert(
    solo.total === 40 &&
      solo.perMatch === 20 &&
      solo.perMinute === 2 &&
      solo.best?.count === 30 &&
      withSquad.total === 60 &&
      withSquad.best?.count === 45 &&
      summarize([], false).perMatch === 0,
    "summarize() self-check failed",
  );
}
