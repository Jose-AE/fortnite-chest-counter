import { toMatches } from "@/lib/saved-matches";
import { toSettings } from "@/lib/settings";
import type { Match } from "@/types/match.types";
import type { Settings } from "@/types/settings.types";

// Downloads the saved matches and settings as chest-counter-YYYY-MM-DD.json.
export const downloadBackup = (matches: Match[], settings: Settings) => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify({ matches, settings }, null, 2)], {
      type: "application/json",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `chest-counter-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

// What a picked file holds, checked: entries that are not matches are dropped, bad settings fall back to
// defaults, and settings is null when the file has none. A file that is not JSON holds nothing.
export const readBackup = async (
  file: File,
): Promise<{ matches: Match[]; settings: Settings | null }> => {
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    return { matches: [], settings: null };
  }
  // the first exports were a bare list of matches, with no settings
  if (Array.isArray(data)) return { matches: toMatches(data), settings: null };
  const { matches, settings } = (data ?? {}) as {
    matches?: unknown;
    settings?: unknown;
  };
  return {
    matches: Array.isArray(matches) ? toMatches(matches) : [],
    settings: settings ? toSettings(settings) : null,
  };
};
