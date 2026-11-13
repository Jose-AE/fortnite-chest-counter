import {
  RiKey2Line,
  RiSpeedUpLine,
  RiStackLine,
  RiTeamLine,
  RiTrophyLine,
} from "@remixicon/react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { Summary } from "@/lib/stats";
import { cn } from "@/lib/utils";

// The five smaller numbers under the Hero. Before any match is counted they are real 0s, dimmed.
export function StatTiles({ summary }: { summary: Summary }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4 md:grid-cols-5",
        summary.matchCount === 0 && "opacity-50",
      )}
    >
      <Tile
        icon={RiKey2Line}
        label="By you"
        value={formatNumber(summary.byYou)}
        note={`${formatNumber(summary.opened)} opened · ${formatNumber(summary.broken)} broken`}
      />
      <Tile
        icon={RiTeamLine}
        label="Teammate chests"
        value={formatNumber(summary.teammates)}
        note={`${formatNumber(summary.teamOpened)} opened · ${formatNumber(summary.teamBroken)} broken`}
      />
      <Tile
        icon={RiStackLine}
        label="Per match"
        value={formatNumber(summary.perMatch)}
        note="average"
      />
      <Tile
        icon={RiTrophyLine}
        label="Best match"
        value={formatNumber(summary.best?.count ?? 0)}
        note={summary.best ? formatDateTime(summary.best.date) : undefined}
      />
      <Tile
        icon={RiSpeedUpLine}
        label="Per minute"
        value={formatNumber(summary.perMinute)}
        note="of match time"
        className="col-span-2 md:col-span-1"
      />
    </div>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  note,
  className,
}: {
  icon: typeof RiKey2Line;
  label: string;
  value: string;
  note?: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          <Icon className="size-4 text-primary" />
          {label}
        </CardDescription>
        <CardTitle className="text-4xl font-black">{value}</CardTitle>
        <CardDescription className="min-h-5">{note}</CardDescription>
      </CardHeader>
    </Card>
  );
}
