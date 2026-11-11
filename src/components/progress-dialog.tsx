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
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
