import { useRef, useState } from "react";
import { MatchesCard } from "@/components/matches-card";
import { ProgressDialog } from "@/components/progress-dialog";
import { ReplayPicker } from "@/components/replay-picker";
import { Hero, StatTiles } from "@/components/totals";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cancelParsing, parseReplay, ReplayTimeout } from "@/lib/parser";
import {
  loadMatches,
  loadTimedOut,
  saveMatches,
  saveTimedOut,
} from "@/lib/saved-matches";
import { summarize } from "@/lib/stats";
import type { Issue, ReplayFile } from "@/types/match.types";

function App() {
  const [files, setFiles] = useState<File[]>([]);
  // whether teammates' chests count towards the totals and the chart
  const [includeSquad, setIncludeSquad] = useState(false);
  // every match counted so far, including earlier visits (kept in localStorage)
  const [matches, setMatches] = useState(loadMatches);
  // files from the last count that could not be counted
  const [issues, setIssues] = useState<Issue[]>([]);
  const [progress, setProgress] = useState(0); // files handled in the running count
  const [busy, setBusy] = useState(false);

  const updateFiles = (next: File[]) => {
    if (busy) return; // the running count indexes into the current list
    setFiles(next);
  };
  const clearSaved = () => {
    if (!confirm("Remove all saved matches from this browser?")) return;
    saveMatches([]);
    saveTimedOut([]); // so replays that timed out get another try
    setMatches([]);
    setIssues([]);
  };
  const cancelled = useRef(false);
  const cancel = () => {
    cancelled.current = true;
    cancelParsing();
  };
  const countChests = async () => {
    cancelled.current = false;
    setBusy(true);
    setProgress(0);
    const all = [...matches];
    const notes: Issue[] = [];
    let handled = 0;
    let omitted = 0; // already counted: left out of the table, reported in one toast at the end
    const timedOut = loadTimedOut();
    let slow = 0; // timed out on an earlier count: not tried again, also reported in a toast
    for (const file of files) {
      const sameFile = (f: ReplayFile) =>
        f.fileName === file.name && f.fileSize === file.size;
      // same name and size as a saved match: already scanned, no need to parse it again
      const known = all.some(sameFile);
      const knownSlow = timedOut.some(sameFile);
      const result =
        known || knownSlow
          ? null
          : await parseReplay(file).catch((e) =>
              e instanceof Error ? e : new Error(String(e)),
            );
      if (cancelled.current) break;
      if (knownSlow) slow++;
      else if (result instanceof Error) {
        if (result instanceof ReplayTimeout) {
          timedOut.push({ fileName: file.name, fileSize: file.size });
          saveTimedOut(timedOut);
        }
        notes.push({
          fileName: file.name,
          message: result.message.split("\n")[0],
        });
      } else if (
        result === null ||
        (result.matchId && all.some((m) => m.matchId === result.matchId))
      )
        omitted++;
      else {
        all.push(result);
        saveMatches(all); // save as we go, so a cancel or a closed tab keeps what was counted
        setMatches([...all]);
      }
      setIssues([...notes]);
      setProgress(++handled);
    }
    setFiles(files.slice(handled)); // after a cancel, the files not reached stay in the list
    setBusy(false);
    if (omitted > 0)
      toast.add({
        type: "info",
        title:
          omitted === 1
            ? "1 replay was omitted as it was already counted"
            : `${omitted} replays were omitted as they were already counted`,
      });
    if (slow > 0)
      toast.add({
        type: "info",
        title:
          slow === 1
            ? "1 replay was skipped as it timed out before"
            : `${slow} replays were skipped as they timed out before`,
        description: "Clear saved to try again.",
      });
  };

  const summary = summarize(matches, includeSquad);

  return (
    <div className="relative min-h-svh overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_80%_-10%,--theme(--color-primary/18%),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,--theme(--color-foreground/4%)_1px,transparent_1px),linear-gradient(to_bottom,--theme(--color-foreground/4%)_1px,transparent_1px)] bg-[size:3rem_3rem]"
      />

      <main className="relative mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 lg:py-14">
        <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
          <Hero
            summary={summary}
            failed={issues.length}
            includeSquad={includeSquad}
            onIncludeSquad={setIncludeSquad}
          />
          {/* first on a phone, where adding replays is the first thing to do */}
          <section className="order-first flex flex-col gap-4 lg:order-last">
            <ReplayPicker
              files={files}
              disabled={busy}
              onAdd={(added) => updateFiles([...files, ...added])}
              onRemove={(index) =>
                updateFiles(files.filter((_, i) => i !== index))
              }
            />
            <Button
              size="lg"
              className="h-12 text-base font-bold tracking-wide uppercase"
              disabled={files.length === 0 || busy}
              onClick={countChests}
            >
              Count chests
              {files.length > 0 && ` in ${files.length} replays`}
            </Button>
          </section>
        </div>

        <StatTiles summary={summary} includeSquad={includeSquad} />

        <MatchesCard
          matches={matches}
          issues={issues}
          includeSquad={includeSquad}
          busy={busy}
          onClear={clearSaved}
        />

        <footer className="pt-2 text-center text-xs text-muted-foreground">
          Chest Counter is a fan-made tool. It is not affiliated with, endorsed
          or sponsored by Epic Games. Fortnite is a trademark of Epic Games,
          Inc.
        </footer>
      </main>

      <ProgressDialog
        open={busy}
        files={files}
        done={progress}
        totalChests={summary.total}
        failed={issues.length}
        onCancel={cancel}
      />
    </div>
  );
}

export default App;
