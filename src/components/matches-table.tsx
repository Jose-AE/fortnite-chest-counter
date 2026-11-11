import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
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
import { cn } from "@/lib/utils";
import type { Issue, Match } from "@/types/match.types";

// Every saved match, newest first, with the files that failed in the last count on top.
export function MatchesTable({
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
  const rows = [...matches]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .map((match) => ({
      name: match.fileName,
      date: new Date(match.date).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
      // "Playlist_NoBuildBR_Squad" -> "NoBuildBR Squad"
      mode: match.playlist.replace(/^Playlist_/, "").replaceAll("_", " "),
      length: `${Math.floor(match.durationSeconds / 60)}:${String(match.durationSeconds % 60).padStart(2, "0")}`,
      opened: match.chestCountSearched + match.chestCountBroken,
      squad: match.teamChestCountSearched + match.teamChestCountBroken,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Matches</CardTitle>
        <CardDescription>
          Saved in this browser, so your total keeps growing after Fortnite
          deletes old replays.
        </CardDescription>
        {matches.length > 0 && (
          <CardAction>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={onClear}
            >
              Clear saved
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {rows.length + issues.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No matches counted yet.
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
              {issues.map((issue, i) => (
                <TableRow key={`issue-${i}`}>
                  <TableCell
                    title={issue.fileName}
                    className="max-w-40 truncate"
                  >
                    {issue.fileName}
                  </TableCell>
                  <TableCell
                    colSpan={5}
                    title={issue.message}
                    className="max-w-64 truncate text-right text-destructive"
                  >
                    {issue.message}
                  </TableCell>
                </TableRow>
              ))}
              {rows.map((row, i) => (
                <TableRow key={i}>
                  <TableCell title={row.name} className="max-w-40 truncate">
                    {row.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.date}
                  </TableCell>
                  <TableCell>{row.mode}</TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {row.length}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.opened}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums",
                      !includeSquad && "opacity-30",
                    )}
                  >
                    {row.squad}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
