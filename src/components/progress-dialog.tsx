import { useEffect, useState } from "react";
import { RiLoader4Line } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { LIMIT_MS } from "@/lib/parser";

// Appears once a replay has been parsing for 10 seconds, so the wait does not look like a freeze.
function SlowNote() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 10_000);
    return () => clearTimeout(timer);
  }, []);
  return slow ? (
    <p className="text-xs text-muted-foreground">
      This replay is taking longer than usual. It is skipped automatically
      at {LIMIT_MS / 1000} seconds.
    </p>
  ) : null;
}

// The modal shown while replays are being counted.
export function ProgressDialog({
  open,
  files,
  done,
  totalChests,
  failed,
  onCancel,
}: {
  open: boolean;
  files: File[];
  done: number; // files handled so far
  totalChests: number;
  failed: number;
  onCancel: () => void;
}) {
  return (
    // no onOpenChange: it stays open until counting ends or is cancelled
    <Dialog open={open}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RiLoader4Line
              aria-hidden
              className="size-4 animate-spin text-primary"
            />
            Counting chests
          </DialogTitle>
          <DialogDescription>
            Replays are read on your device. Nothing is uploaded.
          </DialogDescription>
        </DialogHeader>
        <Progress value={done} max={files.length}>
          <ProgressLabel className="min-w-0 flex-1 truncate">
            {files[done]?.name}
          </ProgressLabel>
          <ProgressValue>{() => `${done} of ${files.length}`}</ProgressValue>
        </Progress>
        <p className="text-sm text-muted-foreground">
          <span className="text-3xl font-black text-primary tabular-nums">
            {totalChests}
          </span>{" "}
          chests in total
          {failed > 0 && `, ${failed} not counted`}
        </p>
        {/* keyed by file, so the 10 seconds start again for each replay */}
        <SlowNote key={done} />
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
