import { useState } from "react";
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
          variant={value === option ? "secondary" : "ghost"}
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
}: {
  matches: Match[];
  issues: Issue[];
  includeSquad: boolean;
  busy: boolean;
  onClear: () => void;
}) {
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
        <CardTitle>
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
      {!empty && (
        <CardFooter className="justify-between gap-4 text-xs text-muted-foreground">
          Saved in this browser, so your total keeps growing after Fortnite
          deletes old replays.
          <Button variant="ghost" size="sm" disabled={busy} onClick={onClear}>
            Clear saved
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
