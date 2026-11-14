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
}: {
  settings: Settings;
  onChange: (settings: Settings) => void;
}) {
  const [open, setOpen] = useState(false);
  const [odds, setOdds] = useState("");
  const [extra, setExtra] = useState("");
  const [recount, setRecount] = useState(false);
  const oddsValue = parseWhole(odds, 1);
  const extraValue = extra.trim() === "" ? 0 : parseWhole(extra, 0); // cleared field means none

  const openChange = (next: boolean) => {
    if (next) {
      // start from the saved values each time, so a cancelled edit is forgotten
      setOdds(String(settings.tokenOdds));
      setExtra(String(settings.extraChests));
      setRecount(settings.recount);
    }
    setOpen(next);
  };
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (oddsValue === null || extraValue === null) return;
    // spread first: the dialog does not edit every setting (includeSquad is the Hero's checkbox)
    onChange({ ...settings, tokenOdds: oddsValue, extraChests: extraValue, recount });
    setOpen(false);
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

          <label className="grid gap-1.5">
            <span className="font-bold">Chests not in replays</span>
            <Input
              inputMode="numeric"
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              aria-invalid={extraValue === null}
            />
            <span className="text-muted-foreground">
              From games you have no replay of. Added to the total and the
              token chance, not to the chart or the averages.
            </span>
          </label>

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
            <Button type="submit" disabled={oddsValue === null || extraValue === null}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
