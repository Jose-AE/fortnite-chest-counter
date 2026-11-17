import { RiSettings3Line } from "@remixicon/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { formatNumber } from "@/lib/format";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import {
  loadPlayerApiKey,
  savePlayerApiKey,
} from "@/lib/player-stats";
import type { Settings } from "@/types/settings.types";

// A whole number of at least `min`, or null. Commas and spaces are allowed, as people type "137,500".
const parseWhole = (text: string, min: number) => {
  const n = Number(text.replace(/[,\s]/g, ""));
  return text.trim() !== "" && Number.isInteger(n) && n >= min ? n : null;
};

// The gear button and the dialog it opens. Edits are drafts until Save.
export function SettingsDialog({
  settings,
  onChange,
  onFetchEstimate,
}: {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onFetchEstimate: (apiKey: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [odds, setOdds] = useState("");
  const [extraYou, setExtraYou] = useState("");
  const [extraTeam, setExtraTeam] = useState("");
  const [recount, setRecount] = useState(false);
  const [estimateEnabled, setEstimateEnabled] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const oddsValue = parseWhole(odds, 1);
  const extraYouValue = extraYou.trim() === "" ? 0 : parseWhole(extraYou, 0);
  const extraTeamValue = extraTeam.trim() === "" ? 0 : parseWhole(extraTeam, 0);

  const openChange = (next: boolean) => {
    if (next) {
      // start from the saved values each time, so a cancelled edit is forgotten
      setOdds(String(settings.tokenOdds));
      setExtraYou(String(settings.extraChestsYou));
      setExtraTeam(String(settings.extraChestsTeam));
      setRecount(settings.recount);
      setEstimateEnabled(settings.estimateMissedChests);
      setApiKey(loadPlayerApiKey());
    }
    setOpen(next);
  };
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      oddsValue === null ||
      extraYouValue === null ||
      extraTeamValue === null
    )
      return;
    const trimmedApiKey = apiKey.trim();
    savePlayerApiKey(trimmedApiKey);
    // spread first: the dialog does not edit every setting (includeSquad is the Hero's checkbox)
    onChange({
      ...settings,
      tokenOdds: oddsValue,
      extraChestsYou: extraYouValue,
      extraChestsTeam: extraTeamValue,
      estimateMissedChests: estimateEnabled,
      recount,
    });
    setOpen(false);
    if (estimateEnabled && trimmedApiKey && !settings.seasonStats)
      onFetchEstimate(trimmedApiKey);
  };
  const fetchEstimate = () => {
    const trimmedApiKey = apiKey.trim();
    if (!estimateEnabled || !trimmedApiKey) return;
    savePlayerApiKey(trimmedApiKey);
    onFetchEstimate(trimmedApiKey);
  };

  return (
    <Dialog open={open} onOpenChange={openChange}>
      <DialogTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label="Settings" />}
      >
        <RiSettings3Line />
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={save} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Saved in this browser and included when you export.
            </DialogDescription>
          </DialogHeader>

          <label className="grid gap-1.5">
            <span className="font-bold">Shop token odds</span>
            <span className="flex items-center gap-2">
              {/* shrink-0: next to a full-width input the label would otherwise wrap to "1 / in" */}
              <span className="shrink-0 whitespace-nowrap">1 in</span>
              <Input
                inputMode="numeric"
                value={odds}
                onChange={(e) => setOdds(e.target.value)}
                aria-invalid={oddsValue === null}
              />
            </span>
            <span className="text-muted-foreground">
              Default 1 in {formatNumber(DEFAULT_SETTINGS.tokenOdds)}.{" "}
              {String(DEFAULT_SETTINGS.tokenOdds) !== odds && (
                <button
                  type="button"
                  className="text-foreground underline underline-offset-4"
                  onClick={() => setOdds(String(DEFAULT_SETTINGS.tokenOdds))}
                >
                  Reset
                </button>
              )}
            </span>
          </label>

          <div className="grid gap-1.5">
            <span className="font-bold">Chests not in replays</span>
            {/* "after:": the line between the 2 labels */}
            <span className="relative grid grid-cols-2 gap-3 after:pointer-events-none after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-border">
              <label className="flex items-center gap-2">
                <Input
                  inputMode="numeric"
                  value={extraYou}
                  onChange={(e) => setExtraYou(e.target.value)}
                  aria-invalid={extraYouValue === null}
                  className="min-w-0 flex-1"
                />
                {/* w-14: set width, for consistant spacing */}
                <span className="w-14 shrink-0 whitespace-nowrap">by you</span>
              </label>
              <label className="flex items-center gap-2">
                <Input
                  inputMode="numeric"
                  value={extraTeam}
                  onChange={(e) => setExtraTeam(e.target.value)}
                  aria-invalid={extraTeamValue === null}
                  className="min-w-0 flex-1"
                />
                <span className="w-14 shrink-0 whitespace-nowrap">by team</span>
              </label>
            </span>
            <span className="text-muted-foreground">
              From games you have no replay of. Added to the total and the
              token chance, not to the chart or the averages.
            </span>
          </div>

          <div className="grid gap-1.5">
            <label className="flex cursor-pointer items-center gap-2 font-bold">
              <Checkbox
                checked={estimateEnabled}
                onCheckedChange={setEstimateEnabled}
              />
              Estimate missed chest count
            </label>
            {/* -webkit-text-security:disc: makes it basically type="password", but doesn't actually count it as a password */}
            <Input
              type="text"
              autoComplete="off"
              aria-label="API key"
              placeholder="API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={!estimateEnabled}
              aria-invalid={estimateEnabled && !apiKey.trim()}
              className="[-webkit-text-security:disc]"
            />
            <span className="text-muted-foreground">
              Uses current-season playtime to estimate chests outside saved
              replays. The key stays in this browser and is not exported. Get a
              key from{" "}
              <a
                href="https://fortnite-api.com/"
                target="_blank"
                rel="noreferrer"
                className="text-foreground underline underline-offset-4"
              >
                Fortnite-API
              </a>
              .
            </span>
            {settings.seasonStats && (
              <p className="text-muted-foreground">
                Season playtime saved {new Date(settings.seasonStats.fetchedAt).toLocaleDateString()}.{" "}
                <button
                  type="button"
                  className="text-foreground underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={fetchEstimate}
                  disabled={!estimateEnabled || !apiKey.trim()}
                >
                  Refetch
                </button>
              </p>
            )}
          </div>

          <label className="grid cursor-pointer gap-1.5">
            <span className="flex items-center gap-2 font-bold">
              <Checkbox checked={recount} onCheckedChange={setRecount} />
              Replace saved matches
            </span>
            <span className="text-muted-foreground">
              Count replays again even if they&apos;re already saved, and
              replace the old numbers. Use this after an update fixes the
              count.
            </span>
          </label>

          <DialogFooter>
            <Button
              type="submit"
              disabled={
                oddsValue === null ||
                extraYouValue === null ||
                extraTeamValue === null
              }
            >
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
