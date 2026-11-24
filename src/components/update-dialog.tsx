import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { readJson, writeJson } from "@/lib/storage";

// Change this, and the text below, to show the dialog again for the next update.
const UPDATE = "2026-11-24-buried-chests";
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
        <UpdateNotes />
        <DialogFooter>
          <Button onClick={close}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// The same notes on demand, opened by the "What's new" button in the info dialog.
export function WhatsNewDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <UpdateNotes />
        <DialogFooter>
          <DialogClose render={<Button />}>Close</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UpdateNotes() {
  return (
    <>
      <DialogHeader>
        <DialogTitle>New update released</DialogTitle>
        <DialogDescription>
          The White Tiger sprite changed the chest meta: it is now about
          breaking chests, and knocking down whole buildings full of them,
          more than opening them. This update makes the counter keep up.
        </DialogDescription>
      </DialogHeader>
      <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
        <li>
          <b className="text-foreground">Destroyed buildings count.</b> A new
          system counts the chests that fall when you knock a building down,
          if you were swinging your pickaxe just before or wearing the White
          Tiger sprite.
        </li>
        <li>
          <b className="text-foreground">Buried chests count again.</b> Chests
          you dig up were missed in recent matches, so your saved numbers may be
          low.
        </li>
        <li>
          <b className="text-foreground">Fewer stuck replays.</b> A replay with
          a damaged part no longer freezes; the rest of the match is read.
        </li>
        <li>
          <b className="text-foreground">New info button.</b> The (i) at the
          top explains how chests are counted and what a replay cannot tell.
        </li>
        <li>
          <b className="text-foreground">Replay help.</b> New to this?{" "}
          <b className="text-foreground">How do I find my replays?</b> under
          the upload box shows where Fortnite saves them (PC only).
        </li>
      </ul>
      <div className="grid gap-1.5">
        <span className="font-medium">To fix your saved numbers:</span>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>
            Turn on <b className="text-foreground">Replace saved matches</b> in
            Settings (the gear).
          </li>
          <li>Add all your replays again and press Count chests.</li>
          <li>
            Turn <b className="text-foreground">Replace saved matches</b> off
            again, so later uploads skip replays you already counted.
          </li>
        </ol>
      </div>
    </>
  );
}
