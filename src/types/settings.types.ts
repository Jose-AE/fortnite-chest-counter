// Changed in the settings dialog (the teammates switch in the Hero), saved in localStorage.
export interface SeasonStatsCache {
  accountId: string;
  seasonMinutes: number;
  fetchedAt: string;
}

export interface Settings {
  tokenOdds: number; // 1 in this many chests drops a token
  extraChestsYou: number; // your chests from games with no replay, added by hand
  extraChestsTeam: number; // teammates' chests from games with no replay, added by hand
  estimateMissedChests: boolean; // estimate chests using the account's current-season playtime
  seasonStats: SeasonStatsCache | null; // cached API data, included in backups
  includeSquad: boolean; // teammates' chests count towards the totals and the chart
  recount: boolean; // re-read replays that are already saved and replace their numbers, for after a counting fix
}
