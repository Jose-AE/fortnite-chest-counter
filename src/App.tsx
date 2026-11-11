import { useRef, useState } from "react";
import { MatchesTable } from "@/components/matches-table";
import { ProgressDialog } from "@/components/progress-dialog";
import { ReplayPicker } from "@/components/replay-picker";
import { Totals } from "@/components/totals";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/toast";
import { cancelParsing, parseReplay } from "@/lib/parser";
import { loadMatches, saveMatches } from "@/lib/saved-matches";
import type { Issue } from "@/types/match.types";

const OPTIONS = [
  {
    id: "squad",
    label: "Include squad opens",
    hint: "Chests your teammates opened in your matches",
  },
] as const;

type OptionId = (typeof OPTIONS)[number]["id"];

function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [options, setOptions] = useState<Record<OptionId, boolean>>({
    squad: false,
  });
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
    for (const file of files) {
      // same name and size as a saved match: already scanned, no need to parse it again
      const known = all.some(
        (m) => m.fileName === file.name && m.fileSize === file.size,
      );
      const result = known
        ? null
        : await parseReplay(file).catch((e) =>
            e instanceof Error ? e : new Error(String(e)),
          );
      if (cancelled.current) break;
      if (result instanceof Error)
        notes.push({
          fileName: file.name,
          message: result.message.split("\n")[0],
        });
      else if (
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
  };

  const opened = matches.reduce(
    (total, m) => total + m.chestCountSearched + m.chestCountBroken,
    0,
  );
  const squad = options.squad
    ? matches.reduce(
        (total, m) => total + m.teamChestCountSearched + m.teamChestCountBroken,
        0,
      )
    : 0;

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

      <main className="relative mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[22rem_1fr] lg:py-16">
        <section className="flex flex-col gap-4">
          <ReplayPicker
            files={files}
            disabled={busy}
            onAdd={(added) => updateFiles([...files, ...added])}
            onRemove={(index) =>
              updateFiles(files.filter((_, i) => i !== index))
            }
          />

          <fieldset className="flex flex-col gap-3 border bg-card p-4">
            <legend className="px-1 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Options
            </legend>
            {OPTIONS.map((option) => (
              <label key={option.id} className="flex cursor-pointer gap-3">
                <Checkbox
                  className="mt-1"
                  checked={options[option.id]}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, [option.id]: checked })
                  }
                />
                <span>
                  <span className="block text-sm font-medium">
                    {option.label}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {option.hint}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

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

        <section className="flex flex-col gap-4">
          <Totals
            opened={opened}
            squad={squad}
            includeSquad={options.squad}
            matchCount={matches.length}
            failed={issues.length}
          />
          <MatchesTable
            matches={matches}
            issues={issues}
            includeSquad={options.squad}
            busy={busy}
            onClear={clearSaved}
          />
        </section>
      </main>

      <ProgressDialog
        open={busy}
        files={files}
        done={progress}
        totalChests={opened + squad}
        failed={issues.length}
        onCancel={cancel}
      />
    </div>
  );
}

export default App;
