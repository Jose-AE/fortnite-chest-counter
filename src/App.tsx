import { useRef, useState } from "react";
import { Links } from "@/components/links";
import { MatchesCard } from "@/components/matches-card";
import { ProgressDialog } from "@/components/progress-dialog";
import { ReplayPicker } from "@/components/replay-picker";
import { Hero } from "@/components/hero";
import { StatTiles } from "@/components/stat-tiles";
import { UpdateDialog } from "@/components/update-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { downloadBackup, readBackup } from "@/lib/backup";
import { formatCount } from "@/lib/format";
import {
  cancelParsing,
  PARALLEL,
  parseReplay,
  ReplayTimeout,
} from "@/lib/parser";
import {
  loadMatches,
  loadTimedOut,
  mergeMatches,
  saveMatches,
  saveTimedOut,
} from "@/lib/saved-matches";
import { loadSettings, saveSettings } from "@/lib/settings";
import { summarize } from "@/lib/stats";
import type { Issue, Match, ReplayFile } from "@/types/match.types";
import type { Settings } from "@/types/settings.types";

function App() {
  const [files, setFiles] = useState<File[]>([]);
  // every match counted so far, including earlier visits (kept in localStorage)
  const [matches, setMatches] = useState(loadMatches);
  // token odds, chests added by hand and the teammates checkbox (kept in localStorage)
  const [settings, setSettings] = useState(loadSettings);
  // whether teammates' chests count towards the totals and the chart, remembered with the other settings
  const includeSquad = settings.includeSquad;
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
  const updateSettings = (next: Settings) => {
    saveSettings(next);
    setSettings(next);
  };
  const importMatches = async (file: File) => {
    const { matches: incoming, settings: imported } = await readBackup(file);
    if (imported) updateSettings(imported);
    if (incoming.length === 0 && !imported) {
      toast.add({
        type: "warning",
        title: "No matches found in that file",
        description: "Pick a file saved with Export.",
      });
      return;
    }
    const all = mergeMatches(matches, incoming);
    const added = all.length - matches.length;
    saveMatches(all);
    setMatches(all);
    toast.add({
      type: added > 0 ? "success" : "info",
      title:
        added > 0
          ? `Imported ${formatCount(added, "match")}`
          : incoming.length > 0
            ? "Every match in that file was already saved"
            : "No matches in that file",
      description: imported ? "Settings were imported too." : undefined,
    });
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
    let recounted = 0; // saved matches replaced with fresh numbers, with the recount setting on
    const recount = settings.recount;
    const sameFile = (file: File) => (f: ReplayFile) =>
      f.fileName === file.name && f.fileSize === file.size;
    // same name and size as a saved match: already scanned, no need to parse it again (unless recounting)
    const skip = (file: File) =>
      !recount && (all.some(sameFile(file)) || timedOut.some(sameFile(file)));
    // Parse up to PARALLEL replays ahead, but handle the results in file order, so the bookkeeping below stays sequential.
    const parsing: Promise<Match | Error | null>[] = [];
    const start = (i: number) => {
      if (i < files.length)
        parsing[i] = skip(files[i])
          ? Promise.resolve(null)
          : parseReplay(files[i]).catch((e) =>
              e instanceof Error ? e : new Error(String(e)),
            );
    };
    for (let i = 0; i < PARALLEL; i++) start(i);
    for (const [i, file] of files.entries()) {
      const knownSlow = !recount && timedOut.some(sameFile(file));
      const result = await parsing[i];
      if (cancelled.current) break;
      start(i + PARALLEL);
      if (knownSlow) slow++;
      else if (result instanceof Error) {
        if (result instanceof ReplayTimeout && !timedOut.some(sameFile(file))) {
          timedOut.push({ fileName: file.name, fileSize: file.size });
          saveTimedOut(timedOut);
        }
        notes.push({
          fileName: file.name,
          message: result.message.split("\n")[0],
        });
      } else if (result === null) omitted++;
      else {
        // the saved match for this replay: the same file, or the same match from another copy of it
        const old = all.findIndex(
          (m) =>
            sameFile(file)(m) ||
            (!!result.matchId && m.matchId === result.matchId),
        );
        if (old >= 0 && !recount) omitted++;
        else {
          if (old >= 0) {
            all[old] = result;
            recounted++;
          } else all.push(result);
          saveMatches(all); // save as we go, so a cancel or a closed tab keeps what was counted
          setMatches([...all]);
        }
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
    if (recounted > 0)
      toast.add({
        type: "success",
        title: `Recounted ${formatCount(recounted, "replay")}`,
        description:
          "Turn off Replace saved matches in Settings when you are done.",
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

  const summary = summarize(matches, includeSquad, settings.extraChests);

  return (
    <div className="relative min-h-svh">
      {/* faint 3rem grid at the top of the page, so it is not one flat grey. It fades out down the page, so it reads as a backdrop for the headline, not graph paper behind the chart */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,--theme(--color-foreground/4%)_1px,transparent_1px),linear-gradient(to_bottom,--theme(--color-foreground/4%)_1px,transparent_1px)] bg-size-[3rem_3rem] [mask-image:linear-gradient(to_bottom,black_0,black_400px,transparent_1100px)]"
      />
      {/* a soft gold glow behind the chest total, so the number looks lit. Centred on a phone, where the hero is centred; on a wide screen it follows the number, 18rem left of the page centre */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_700px_450px_at_50%_220px,--theme(--color-primary/11%),transparent_70%)] lg:bg-[radial-gradient(ellipse_700px_450px_at_calc(50%-18rem)_220px,--theme(--color-primary/11%),transparent_70%)]"
      />
      {/* slim top bar with the name and the author links, like a fan site header */}
      <header className="sticky top-0 z-30 border-b border-black/40 bg-[#26282c]/95 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4">
          <a href="/" className="flex items-center gap-2">
            <img src="/favicon.png" alt="" className="size-7" />
            {/* the page title lives here, so the headline below can be the number */}
            <h1 className="font-heading text-base font-semibold tracking-tight whitespace-nowrap uppercase sm:text-xl">
              Fortnite Chest Counter
            </h1>
          </a>
          <Links />
        </div>
      </header>

      {/* one content width, so the tiles and the chart share both edges */}
      <main className="relative mx-auto flex max-w-5xl flex-col gap-4 px-4 pt-10 pb-10 lg:pt-12">
        {/* side by side on a wide screen: the title and totals on the left, the replays on the right */}
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 pb-4 lg:grid-cols-[minmax(0,1fr)_31rem]">
          <Hero
            summary={summary}
            failed={issues.length}
            includeSquad={includeSquad}
            onIncludeSquad={(value) =>
              updateSettings({ ...settings, includeSquad: value })
            }
            settings={settings}
            onSettings={updateSettings}
          />
          {/* drop zone with the one yellow button under it, like a search box. The row stretches both columns to one height, so the drop zone fills what the list and button leave */}
          <section className="mx-auto flex w-full max-w-lg flex-col gap-2.5">
            <ReplayPicker
              files={files}
              disabled={busy}
              onAdd={(added) => updateFiles([...files, ...added])}
              onRemove={(index) =>
                updateFiles(files.filter((_, i) => i !== index))
              }
            />
            {/* only once there is something to count, so an empty picker has no dead grey block; disabled while counting is plain grey, not a faded yellow */}
            {files.length > 0 && (
              <Button
                size="lg"
                className="h-11 font-heading text-base font-black uppercase sm:text-lg shadow-[inset_0_-3px_0_rgb(0_0_0/15%)] disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 disabled:shadow-none"
                disabled={busy}
                onClick={countChests}
              >
                Count chests in {formatCount(files.length, "replay")}
              </Button>
            )}
          </section>
        </div>

        <StatTiles summary={summary} />

        <MatchesCard
          matches={matches}
          issues={issues}
          includeSquad={includeSquad}
          busy={busy}
          onClear={clearSaved}
          onExport={() => downloadBackup(matches, settings)}
          onImport={importMatches}
        />

        <footer className="pt-2 pb-8 text-center text-xs text-muted-foreground">
          Fortnite Chest Counter is a fan-made tool. It is not affiliated with,
          endorsed or sponsored by Epic Games. Fortnite is a trademark of Epic
          Games, Inc.
        </footer>
      </main>

      <UpdateDialog hasMatches={matches.length > 0} />
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
