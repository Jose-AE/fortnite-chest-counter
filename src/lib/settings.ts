import { TOKEN_ODDS } from "@/lib/stats";
import { readJson, writeJson } from "@/lib/storage";
import type { Settings } from "@/types/settings.types";

const SETTINGS_KEY = "chest-counter:settings";

export const DEFAULT_SETTINGS: Settings = {
  tokenOdds: TOKEN_ODDS,
  extraChestsYou: 0,
  extraChestsTeam: 0,
  includeSquad: false,
  recount: false,
};

const isWhole = (n: unknown, min: number): n is number =>
  Number.isInteger(n) && (n as number) >= min;

// Settings from storage or an imported file; a missing or bad field falls back to its default.
export const toSettings = (s: unknown): Settings => {
  const {
    tokenOdds,
    extraChestsYou,
    extraChestsTeam,
    extraChests: legacyExtraChests, // old chest setting conversion
    includeSquad,
    recount,
  } = (s ?? {}) as Partial<Settings> & { extraChests?: number };
  return {
    tokenOdds: isWhole(tokenOdds, 1) ? tokenOdds : DEFAULT_SETTINGS.tokenOdds,
    extraChestsYou: isWhole(extraChestsYou, 0)
      ? extraChestsYou
      : isWhole(legacyExtraChests, 0)
        ? legacyExtraChests
        : 0,
    extraChestsTeam: isWhole(extraChestsTeam, 0)
      ? extraChestsTeam
      : 0,
    includeSquad: includeSquad === true,
    recount: recount === true,
  };
};

export const loadSettings = () => toSettings(readJson(SETTINGS_KEY));

export const saveSettings = (settings: Settings) =>
  writeJson(SETTINGS_KEY, settings);
