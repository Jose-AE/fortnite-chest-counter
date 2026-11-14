import { RiBarChartFill, RiTableLine } from "@remixicon/react";
import { useRef, useState } from "react";
import { MatchesChart } from "@/components/matches-chart";
import { MatchesTable } from "@/components/matches-table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import { chartBars, type ChartGroup } from "@/lib/stats";
import type { Issue, Match } from "@/types/match.types";

// A row of buttons where exactly one is on.
function Choice<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Record<T, string>; // value -> button text
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-1">
      {(Object.keys(options) as T[]).map((option) => (
        <Button
          key={option}
          size="sm"
          // grey pills with the chosen one white, like a filter bar
          variant={value === option ? "secondary" : "ghost"}
          className="h-8 px-3 font-heading text-sm font-extrabold tracking-wide uppercase not-aria-pressed:bg-muted"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
        >
          {options[option]}
        </Button>
      ))}
    </div>
  );
}

// The saved matches, as a chart or as the table behind it.
export function MatchesCard({
  matches,
  issues,
  includeSquad,
  busy,
  onClear,
  onExport,
  onImport,
}: {
  matches: Match[];
  issues: Issue[];
  includeSquad: boolean;
  busy: boolean;
  onClear: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}) {
  const importInput = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<"chart" | "table">("chart");
  const [group, setGroup] = useState<ChartGroup>("match");
  const empty = matches.length === 0;
  // with nothing to chart, failed files can only be shown in the table
  const showTable = view === "table" || (empty && issues.length > 0);

  const bars = chartBars(matches, includeSquad, group);
  const average =
    bars.reduce((total, bar) => total + bar.you + bar.squad, 0) / bars.length;

  return (
    <Card>
      <CardHeader>
        {/* coloured title with an icon, like a leaderboard panel */}
        <CardTitle className="flex items-center gap-2 text-xl font-black tracking-wide uppercase">
          {showTable ? <RiTableLine className="size-6" /> : <RiBarChartFill className="size-6" />}
          {showTable ? "Matches" : `Chests per ${group}`}
        </CardTitle>
        <CardDescription>
          {empty
            ? "Each match you count shows up here."
            : showTable
              ? "Every saved match, newest first."
              : `Oldest to newest. The line marks your average of ${formatNumber(average)} per ${group}.`}
        </CardDescription>
        {!empty && (
          <CardAction>
            <Choice
              options={{ chart: "Chart", table: "Table" }}
              value={view}
              onChange={setView}
            />
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {showTable ? (
          <MatchesTable
            matches={matches}
            issues={issues}
            includeSquad={includeSquad}
          />
        ) : empty ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No matches counted yet.
          </p>
        ) : (
          <>
            <MatchesChart
              bars={bars}
              group={group}
              includeSquad={includeSquad}
              controls={
                <Choice
                  options={{ match: "Per match", day: "Per day" }}
                  value={group}
                  onChange={setGroup}
                />
              }
            />
            {issues.length > 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                {issues.length} replays could not be counted.{" "}
                <button
                  className="text-foreground underline underline-offset-4"
                  onClick={() => setView("table")}
                >
                  See why in the table
                </button>
              </p>
            )}
          </>
        )}
      </CardContent>
      {/* shown when empty too: importing is how a new browser gets its history back */}
      <CardFooter className="flex-wrap justify-between gap-4 text-sm text-muted-foreground">
        <span className="flex-1 basis-60">
          {empty
            ? "Moving from another browser? Import the file you exported there."
            : "Saved in this browser, so your total survives Fortnite deleting old replays. Export a copy to be safe."}
        </span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => importInput.current?.click()}
          >
            Import
          </Button>
          {!empty && (
            <>
              <Button variant="ghost" size="sm" disabled={busy} onClick={onExport}>
                Export
              </Button>
              <Button variant="destructive" size="sm" disabled={busy} onClick={onClear}>
                Clear saved
              </Button>
            </>
          )}
        </div>
        <input
          ref={importInput}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ""; // so picking the same file again still fires
            if (file) onImport(file);
          }}
        />
      </CardFooter>
    </Card>
  );
}
