import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { readJson, writeJson } from "@/lib/storage";

// Change this, and the text below, to show the dialog again for the next update.
const UPDATE = "2026-11-13-chest-fix";
const SEEN_KEY = "chest-counter:seen-update";

// Shown once per update, only to people with saved matches: their numbers came from the older counter.
export function UpdateDialog({ hasMatches }: { hasMatches: boolean }) {
  const [open, setOpen] = useState(() => {
    if (!hasMatches) writeJson(SEEN_KEY, UPDATE); // nothing saved yet: whatever they count next uses this version
    return hasMatches && readJson(SEEN_KEY) !== UPDATE;
  });
  const close = () => {
    writeJson(SEEN_KEY, UPDATE);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New update released</DialogTitle>
          <DialogDescription>What&apos;s new:</DialogDescription>
        </DialogHeader>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            <b className="text-foreground">More accurate counts.</b> Fixed a
            bug that counted some chests twice, so your saved numbers may be a
            bit high.
          </li>
          <li>
            <b className="text-foreground">About 10x faster.</b> Replays scan
            several at a time.
          </li>
          <li>
            <b className="text-foreground">Replace saved matches.</b> A new
            setting to recount replays you already counted.
          </li>
        </ul>
        <div className="grid gap-1.5">
          <span className="font-medium">To fix your saved numbers:</span>
          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>
              Turn on <b className="text-foreground">Replace saved matches</b>{" "}
              in Settings (the gear).
            </li>
            <li>Add all your replays again and press Count chests.</li>
            <li>
              Turn <b className="text-foreground">Replace saved matches</b> off
              again, so later uploads skip replays you already counted.
            </li>
          </ol>
        </div>
        <DialogFooter>
          <Button onClick={close}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
