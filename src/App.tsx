import { useState } from "react";
import {
  RiCloseLine,
  RiKey2Line,
  RiTeamLine,
  RiUploadCloud2Line,
} from "@remixicon/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parseReplay } from "@/lib/parser";
import { cn } from "@/lib/utils";
import type { Match } from "@/types/match.types";

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
  // one entry per parsed file, in file order: the match, or why it failed
  const [results, setResults] = useState<(Match | Error)[] | null>(null);
  const [busy, setBusy] = useState(false);
  const counted = results !== null;

  const updateFiles = (next: File[]) => {
    if (busy) return; // the running count indexes into the current list
    setFiles(next);
    setResults(null);
  };
  const countChests = async () => {
    setBusy(true);
    const done: (Match | Error)[] = [];
    setResults(done);
    for (const file of files) {
      const result = await parseReplay(file).catch((e) =>
        e instanceof Error ? e : new Error(String(e)),
      );
      const duplicate =
        !(result instanceof Error) &&
        result.matchId &&
        done.some((d) => !(d instanceof Error) && d.matchId === result.matchId);
      done.push(
        duplicate ? new Error("Same match as an earlier file") : result,
      );
      setResults([...done]);
      await new Promise((r) => setTimeout(r)); // let the page repaint between replays
    }
    setBusy(false);
  };
  const addFiles = (list: FileList | null) =>
    updateFiles([...files, ...Array.from(list ?? [])]);

  const rows = files.map((file, i) => {
    const result = results?.[i];
    const match = result instanceof Error ? undefined : result;
    return {
      file,
      parsed: match !== undefined,
      error: result instanceof Error ? result.message.split("\n")[0] : null,
      date: match
        ? new Date(match.date).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "",
      // "Playlist_NoBuildBR_Squad" -> "NoBuildBR Squad"
      mode: match?.playlist.replace(/^Playlist_/, "").replaceAll("_", " "),
      length: match
        ? `${Math.floor(match.durationSeconds / 60)}:${String(match.durationSeconds % 60).padStart(2, "0")}`
        : "",
      opened: match ? match.chestCountSearched + match.chestCountBroken : 0,
      squad: match
        ? match.teamChestCountSearched + match.teamChestCountBroken
        : 0,
    };
  });
  const sum = (key: "opened" | "squad") =>
    rows.reduce((total, row) => total + row[key], 0);
  const opened = sum("opened");
  const squad = options.squad ? sum("squad") : 0;
  const show = (value: number) => (counted ? value : "?");
  const failed = rows.filter((row) => row.error).length;

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
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              addFiles(e.dataTransfer.files);
            }}
            className="flex cursor-pointer flex-col items-center gap-2 border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-8 text-center transition-colors hover:border-primary hover:bg-primary/10 focus-within:border-primary"
          >
            <RiUploadCloud2Line className="size-8 text-primary" />
            <span className="font-semibold">Drop .replay files here</span>
            <span className="text-sm text-muted-foreground">
              or click to browse
            </span>
            <code className="mt-2 text-[11px] break-all text-muted-foreground">
              %LOCALAPPDATA%\FortniteGame\Saved\Demos
            </code>
            <input
              type="file"
              multiple
              accept=".replay"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>

          {files.length > 0 && (
            <ul className="max-h-56 divide-y overflow-y-auto border bg-card text-sm">
              {files.map((file, i) => (
                <li key={i} className="flex items-center gap-2 px-3 py-2">
                  <span className="flex-1 truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {(file.size / 1e6).toFixed(1)} MB
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${file.name}`}
                    disabled={busy}
                    onClick={() => updateFiles(files.filter((_, j) => j !== i))}
                  >
                    <RiCloseLine />
                  </Button>
                </li>
              ))}
            </ul>
          )}

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
            {busy
              ? `Counting ${results?.length ?? 0} of ${files.length}`
              : `Count chests${files.length > 0 ? ` in ${files.length} replays` : ""}`}
          </Button>
        </section>

        <section className="flex flex-col gap-4">
          <Card className="relative overflow-hidden">
            <CardHeader>
              <CardDescription className="tracking-widest uppercase">
                Total chests
              </CardDescription>
              <CardTitle
                key={String(counted)}
                className="animate-in text-8xl leading-none font-black tracking-tighter text-primary tabular-nums duration-500 fade-in slide-in-from-bottom-4 sm:text-9xl"
              >
                {show(opened + squad)}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
              {counted ? (
                <>
                  across {rows.filter((row) => row.parsed).length} replays
                  {failed > 0 && (
                    <Badge variant="destructive">{failed} not counted</Badge>
                  )}
                </>
              ) : (
                "Add replays and press Count chests."
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Tile
              icon={RiKey2Line}
              label="Opened by you"
              value={show(opened)}
            />
            <Tile
              icon={RiTeamLine}
              label="Squad opens"
              value={show(squad)}
              off={!options.squad}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Per replay</CardTitle>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No replays added yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Replay</TableHead>
                      <TableHead>Played</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead className="text-right">Length</TableHead>
                      <TableHead className="text-right">Opened</TableHead>
                      <TableHead className="text-right">Squad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell
                          title={row.file.name}
                          className="max-w-40 truncate"
                        >
                          {row.file.name}
                        </TableCell>
                        {row.error ? (
                          <TableCell
                            colSpan={5}
                            title={row.error}
                            className="max-w-64 truncate text-right text-destructive"
                          >
                            {row.error}
                          </TableCell>
                        ) : (
                          <>
                            <TableCell className="text-muted-foreground">
                              {row.date}
                            </TableCell>
                            <TableCell>{row.mode}</TableCell>
                            <TableCell className="text-right text-muted-foreground tabular-nums">
                              {row.length}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {row.parsed ? row.opened : "?"}
                            </TableCell>
                            <TableCell
                              className={cn(
                                "text-right tabular-nums",
                                !options.squad && "opacity-30",
                              )}
                            >
                              {row.parsed ? row.squad : "?"}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  off,
}: {
  icon: typeof RiKey2Line;
  label: string;
  value: number | string;
  off?: boolean;
}) {
  return (
    <Card className={cn("transition-opacity", off && "opacity-40")}>
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          <Icon className="size-4 text-primary" />
          {label}
        </CardDescription>
        <CardTitle className="text-4xl font-black tabular-nums">
          {off ? "off" : value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

export default App;
