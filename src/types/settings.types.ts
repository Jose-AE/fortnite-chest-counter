// Changed in the settings dialog (the teammates switch in the Hero), saved in localStorage.
export interface Settings {
  tokenOdds: number; // 1 in this many chests drops a token
  extraChests: number; // chests from games with no replay, added to the total by hand
  includeSquad: boolean; // teammates' chests count towards the totals and the chart
  recount: boolean; // re-read replays that are already saved and replace their numbers, for after a counting fix
}
