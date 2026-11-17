import { readJson, writeJson } from "@/lib/storage";
import type { Match } from "@/types/match.types";
import type { SeasonStatsCache } from "@/types/settings.types";

const API_KEY_STORAGE = "chest-counter:fortnite-api-key";

export const loadPlayerApiKey = () => {
  const key = readJson(API_KEY_STORAGE);
  return typeof key === "string" ? key : "";
};

export const savePlayerApiKey = (key: string) =>
  writeJson(API_KEY_STORAGE, key.trim());

export const toSeasonStatsCache = (value: unknown): SeasonStatsCache | null => {
  if (typeof value !== "object" || value === null) return null;
  const cache = value as Partial<SeasonStatsCache>;
  if (
    typeof cache.accountId !== "string" ||
    !/^[a-f\d]{32}$/i.test(cache.accountId) ||
    typeof cache.seasonMinutes !== "number" ||
    !Number.isFinite(cache.seasonMinutes) ||
    cache.seasonMinutes < 0 ||
    typeof cache.fetchedAt !== "string" ||
    !Number.isFinite(Date.parse(cache.fetchedAt))
  )
    return null;
  return {
    accountId: cache.accountId.toLowerCase(),
    seasonMinutes: cache.seasonMinutes,
    fetchedAt: cache.fetchedAt,
  };
};

export async function fetchSeasonMinutes(
  accountId: string,
  apiKey: string,
): Promise<SeasonStatsCache> {
  const normalizedAccountId = accountId.toLowerCase();
  const response = await fetch(
    `https://fortnite-api.com/v2/stats/br/v2/${encodeURIComponent(normalizedAccountId)}?timeWindow=season`,
    { headers: { Authorization: apiKey.trim() }, cache: "no-store" },
  );
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: unknown;
    } | null;
    const errorText =
      typeof payload?.error === "string" ? `: ${payload.error}` : "";
    throw new Error(
      `Fetch failed with status ${response.status}${errorText}`,
    );
  }
  const payload = await response.json();
  const minutes = payload?.data?.stats?.all?.overall?.minutesPlayed;
  if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes < 0) {
    throw new Error(
      `Fetch failed with status ${response.status}: response did not include current-season playtime.`,
    );
  }
  return {
    accountId: normalizedAccountId,
    seasonMinutes: minutes,
    fetchedAt: new Date().toISOString(),
  };
}

export function replayAccountId(matches: Match[]) {
  const ids = [
    ...new Set(
      matches
        .map((match) => match.accountId)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
        .map((id) => id.toLowerCase()),
    ),
  ];
  if (ids.length > 1) {
    throw new Error(
      "Saved replays contain more than one recorder account. Recount one account at a time.",
    );
  }
  if (ids.length === 0) {
    throw new Error("No recorder account ID is saved yet. Recount a replay to find it locally.");
  }
  return ids[0].toLowerCase();
}

export function estimateMissedChests(
  matches: Match[],
  cache: SeasonStatsCache | null,
) {
  if (
    !cache ||
    matches.some(
      (match) =>
        match.accountId &&
        match.accountId.toLowerCase() !== cache.accountId.toLowerCase(),
    )
  ) {
    return { you: 0, team: 0 };
  }
  const replayMinutes = matches.reduce((total, match) => total + match.durationSeconds, 0) / 60;
  if (replayMinutes <= 0) return { you: 0, team: 0 };

  const missingMinutes = Math.max(0, cache.seasonMinutes - replayMinutes);
  const chestsYou = matches.reduce(
    (total, match) => total + match.chestCountSearched + match.chestCountBroken,
    0,
  );
  const chestsTeam = matches.reduce(
    (total, match) => total + match.teamChestCountSearched + match.teamChestCountBroken,
    0,
  );
  return {
    you: Math.round((chestsYou / replayMinutes) * missingMinutes),
    team: Math.round((chestsTeam / replayMinutes) * missingMinutes),
  };
}
