import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatDateTime,
  formatLength,
  formatMode,
  formatNumber,
} from "@/lib/format";
import { teammates, yours } from "@/lib/stats";
import { cn } from "@/lib/utils";
import type { Issue, Match } from "@/types/match.types";

// Every saved match, newest first, with the files that failed in the last count on top.
export function MatchesTable({
  matches,
  issues,
  includeSquad,
}: {
  matches: Match[];
  issues: Issue[];
  includeSquad: boolean;
}) {
  const rows = [...matches].sort(
    (a, b) => Date.parse(b.date) - Date.parse(a.date),
  );

  return (
    <div className="scrollbar-subtle max-h-[32rem] overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Replay</TableHead>
            <TableHead>Played</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead className="text-right">Length</TableHead>
            <TableHead className="text-right">Opened</TableHead>
            <TableHead className="text-right">Teammates</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {issues.map((issue, i) => (
            <TableRow key={`issue-${i}`}>
              <TableCell title={issue.fileName} className="max-w-56 truncate">
                {issue.fileName}
              </TableCell>
              <TableCell
                colSpan={5}
                title={issue.message}
                className="text-right whitespace-normal text-destructive"
              >
                {issue.message}
              </TableCell>
            </TableRow>
          ))}
          {rows.map((match, i) => (
            <TableRow key={i}>
              <TableCell title={match.fileName} className="max-w-56 truncate">
                {match.fileName}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDateTime(match.date)}
              </TableCell>
              <TableCell>{formatMode(match.playlist)}</TableCell>
              <TableCell className="text-right text-muted-foreground tabular-nums">
                {formatLength(match.durationSeconds)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatNumber(yours(match))}
              </TableCell>
              <TableCell
                className={cn(
                  "text-right tabular-nums",
                  !includeSquad && "opacity-30",
                )}
              >
                {formatNumber(teammates(match))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
