import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const FOLDER = String.raw`%LOCALAPPDATA%\FortniteGame\Saved\Demos`;

// The "How do I find my replays?" link under the drop zone, for people who have never opened a replay file.
export function ReplayHelpDialog() {
  return (
    <Dialog>
      <DialogTrigger className="text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none">
        How do I find my replays?
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Finding your replays</DialogTitle>
          <DialogDescription>
            Fortnite saves a replay of each match on your PC. Add them here and
            the chests in each match are counted. This only works for matches
            played on PC: consoles and phones do not save replay files.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <span className="font-medium">From Fortnite</span>
          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>
              Go to <b className="text-foreground">Career</b> &gt;{" "}
              <b className="text-foreground">Replays</b>.
            </li>
            <li>
              Click <b className="text-foreground">Open Replay Folder</b>. It
              opens in File Explorer.
            </li>
          </ol>
        </div>
        <div className="grid gap-1.5">
          <span className="font-medium">From Windows</span>
          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>
              Press <b className="text-foreground">Windows + R</b>.
            </li>
            <li>
              Paste this and press <b className="text-foreground">Enter</b>:
              <code className="mt-1 block break-all text-white/80">
                {FOLDER}
              </code>
            </li>
          </ol>
          <span className="text-muted-foreground">
            That is the same as
            <code className="mt-1 block break-all text-white/80">
              C:\Users\&lt;you&gt;\AppData\Local\FortniteGame\Saved\Demos
            </code>
          </span>
        </div>
        <div className="grid gap-1.5">
          <span className="font-medium">Then</span>
          <p className="text-muted-foreground">
            Drag the whole <b className="text-foreground">Demos</b> folder onto
            the box, or use <b className="text-foreground">Choose folder</b>,
            and press <b className="text-foreground">Count chests</b>.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
