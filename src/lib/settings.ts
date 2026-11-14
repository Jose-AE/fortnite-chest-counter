import { TOKEN_ODDS } from "@/lib/stats";
import { readJson, writeJson } from "@/lib/storage";
import type { Settings } from "@/types/settings.types";

const SETTINGS_KEY = "chest-counter:settings";

export const DEFAULT_SETTINGS: Settings = {
  tokenOdds: TOKEN_ODDS,
  extraChests: 0,
  includeSquad: false,
  recount: false,
};

const isWhole = (n: unknown, min: number): n is number =>
  Number.isInteger(n) && (n as number) >= min;

// Settings from storage or an imported file; a missing or bad field falls back to its default.
export const toSettings = (s: unknown): Settings => {
  const { tokenOdds, extraChests, includeSquad, recount } = (s ?? {}) as Partial<Settings>;
  return {
    tokenOdds: isWhole(tokenOdds, 1) ? tokenOdds : DEFAULT_SETTINGS.tokenOdds,
    extraChests: isWhole(extraChests, 0) ? extraChests : 0,
    includeSquad: includeSquad === true,
    recount: recount === true,
  };
};

export const loadSettings = () => toSettings(readJson(SETTINGS_KEY));

export const saveSettings = (settings: Settings) =>
  writeJson(SETTINGS_KEY, settings);
