import {
  RiKey2Line,
  RiSpeedUpLine,
  RiStackLine,
  RiTeamLine,
  RiTrophyLine,
} from "@remixicon/react";
import { Card } from "@/components/ui/card";
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
      {/* colours follow the chart: warm orange is you (gold bars), blue is teammates (blue bars) */}
      <Tile
        tint={["#d98a30", "#6a3a10"]}
        icon={RiKey2Line}
        label="By you"
        value={formatNumber(summary.byYou)}
        note={`${formatNumber(summary.opened)} opened · ${formatNumber(summary.broken)} broken`}
      />
      <Tile
        tint={["#3a7fd9", "#173a70"]}
        icon={RiTeamLine}
        label="Teammate chests"
        value={formatNumber(summary.teammates)}
        note={`${formatNumber(summary.teamOpened)} opened · ${formatNumber(summary.teamBroken)} broken`}
      />
      <Tile
        tint={["#45a565", "#1c4a2c"]}
        icon={RiStackLine}
        label="Per match"
        value={formatNumber(summary.perMatch)}
        note="average"
      />
      <Tile
        tint={["#9447cf", "#3e1a60"]}
        icon={RiTrophyLine}
        label="Best match"
        value={formatNumber(summary.best?.count ?? 0)}
        note={summary.best ? formatDateTime(summary.best.date) : undefined}
      />
      <Tile
        tint={["#d04a3e", "#6a1d1a"]}
        icon={RiSpeedUpLine}
        label="Per minute"
        value={formatNumber(summary.perMinute)}
        note="of match time"
        className="col-span-2 md:col-span-1"
      />
    </div>
  );
}

// One tile, built like an item card in the shop: the number and its label over a coloured block, a dark strip under it.
function Tile({
  icon: Icon,
  label,
  value,
  note,
  tint,
  className,
}: {
  icon: typeof RiKey2Line;
  label: string;
  value: string;
  note?: string;
  tint: [string, string]; // top and bottom of the coloured block
  className?: string;
}) {
  return (
    <Card className={cn("gap-0 py-0 ring-0", className)}>
      <div
        className="relative flex h-28 flex-col justify-end overflow-hidden px-3 pb-2.5"
        style={{ background: `linear-gradient(to bottom, ${tint[0]}, ${tint[1]})` }}
      >
        {/* the icon large and faint in the corner, where an item picture would be */}
        <Icon className="absolute -top-2 -right-2 size-24 text-white/18" />
        <span className="relative font-heading text-3xl leading-none font-black tabular-nums [text-shadow:0_2px_0_rgb(0_0_0/35%)]">
          {value}
        </span>
        <span className="relative font-heading text-sm leading-tight font-black tracking-wide uppercase [text-shadow:0_2px_0_rgb(0_0_0/35%)]">
          {label}
        </span>
      </div>
      <div className="flex min-h-9 items-center bg-[#1b1c1f] px-3 text-xs font-semibold text-white/75">
        {note}
      </div>
    </Card>
  );
}
