import { useState } from "react";
import { RiInformation2Line } from "@remixicon/react";
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
import { WhatsNewDialog } from "@/components/update-dialog";
import { LIMIT_MS } from "@/lib/parser";

// The info button in the top bar: how counting works and what a replay cannot tell.
export function InfoDialog() {
  const [open, setOpen] = useState(false);
  const [whatsNew, setWhatsNew] = useState(false);
  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        aria-label="How it works"
        title="How it works"
        className="rounded-md p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:text-primary focus-visible:outline-none"
      >
        <RiInformation2Line className="size-5" />
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How it works</DialogTitle>
          <DialogDescription>
            Your replays are read in your browser. Nothing is uploaded.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <span className="font-medium">What counts as a chest</span>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Every chest you open. A refilled chest counts again.</li>
            <li>
              Every unopened chest you break, since it drops its loot. Buried
              chests you dig up count here too.
            </li>
            <li>
              Chests that fall when you collapse a building, if you were
              swinging your pickaxe just before, or wearing the White Tiger
              sprite.
            </li>
          </ul>
        </div>
        <div className="grid gap-1.5">
          <span className="font-medium">Limitations</span>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              A replay only records what was near you, so teammate counts are
              only for chests they looted close to you.
            </li>
            <li>
              Sometimes the replay does not say who broke a chest. Those are
              left out, so your count can be a little low.
            </li>
            <li>
              A building collapse does not record who caused it. If an enemy
              collapses one while you are swinging nearby, its chests may be
              given to you.
            </li>
            <li>
              Fortnite keeps only your most recent replays (about 100), and
              replays from very old seasons may not read.
            </li>
            <li>
              A replay that takes over {LIMIT_MS / 1000} seconds to read is
              skipped.
            </li>
          </ul>
        </div>
        <div className="grid gap-1.5">
          <span className="font-medium">Support</span>
          <p className="text-muted-foreground">
            This tool is free and has no ads. If it helped you, you can{" "}
            <a
              href="https://buymeacoffee.com/joseae"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              buy me a coffee
            </a>

            . I make this as a passion project, so donations mostly go
            toward hosting costs. You can also{" "}
            <a
              href="https://github.com/Jose-AE/fortnite-chest-counter"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              star it on GitHub
            </a>{" "}
            to show your support.
          </p>
        </div>
        <DialogFooter>
          {/* swap dialogs instead of stacking them */}
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
              setWhatsNew(true);
            }}
          >
            What&apos;s new
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <WhatsNewDialog open={whatsNew} onOpenChange={setWhatsNew} />
    </>
  );
}
