import { useState } from "react";
import { formatNumber } from "@/lib/format";
import type { ChartBar, ChartGroup } from "@/lib/stats";
import { cn } from "@/lib/utils";

// 37 -> 50, 103 -> 200: an axis top that is a clean number
const niceCeil = (value: number) => {
  const step = 10 ** Math.floor(Math.log10(value));
  return [1, 2, 5, 10].map((m) => m * step).find((top) => top >= value) ?? value;
};

// One column per match or per day, oldest to newest, with a line at the average. Squad chests stack on top when included.
// Hover only: the table view carries the same numbers for keyboards and screen readers.
export function MatchesChart({
  bars,
  group,
  includeSquad,
  controls,
}: {
  bars: ChartBar[];
  group: ChartGroup;
  includeSquad: boolean;
  controls: React.ReactNode; // shown top right, across from the legend
}) {
  const [tip, setTip] = useState<{ index: number; x: number; y: number }>();

  const top = niceCeil(Math.max(1, ...bars.map((bar) => bar.you + bar.squad)));
  const average =
    bars.reduce((total, bar) => total + bar.you + bar.squad, 0) / bars.length;

  // shortcut: day labels are spaced by column count, assuming a plot about 600px wide or more; measure the plot if labels ever collide
  const labelGap = Math.ceil(bars.length * 0.08);
  const labelled = new Set<number>(); // the first column of each day, when there is room for its label
  for (let i = 0, last = -Infinity; i < bars.length; i++) {
    const isNewDay = i === 0 || bars[i].day !== bars[i - 1].day;
    if (isNewDay && i - last >= labelGap) {
      labelled.add(i);
      last = i;
    }
  }

  // a different grouping can leave the remembered column out of range
  const active = tip && bars[tip.index];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-4 text-xs text-muted-foreground">
          {includeSquad && (
            <>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 bg-chart-1" /> You
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 bg-chart-2" /> Teammates
              </span>
            </>
          )}
        </div>
        {controls}
      </div>

      <div className="flex gap-2">
        {/* y axis: 0, half, top */}
        <div className="relative mb-5 w-10 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums">
          {[0, 0.5, 1].map((at) => (
            <span
              key={at}
              className="absolute right-0 translate-y-1/2 leading-none"
              style={{ bottom: `${at * 100}%` }}
            >
              {formatNumber(top * at)}
            </span>
          ))}
        </div>

        {/* shortcut: columns never get thinner than 6px, so past about 150 columns the plot scrolls sideways; switch to per day if that gets awkward */}
        <div
          role="img"
          aria-label={`Chests per ${group}, ${bars.length} columns, average ${formatNumber(average)}. The table view lists every match.`}
          className="h-60 min-w-0 flex-1 overflow-x-auto overflow-y-hidden"
        >
          <div className="relative flex h-full w-max min-w-full">
            <div className="pointer-events-none absolute inset-x-0 top-0 bottom-5">
              {[0, 0.5, 1].map((at) => (
                <div
                  key={at}
                  className="absolute inset-x-0 border-t border-foreground/10"
                  style={{ bottom: `${at * 100}%` }}
                />
              ))}
              <div
                className="absolute inset-x-0 z-10 border-t border-foreground/50"
                style={{ bottom: `${(average / top) * 100}%` }}
              />
            </div>

            {bars.map((bar, i) => (
              <div
                key={i}
                onPointerEnter={(e) => {
                  const box = e.currentTarget.getBoundingClientRect();
                  setTip({ index: i, x: box.left + box.width / 2, y: box.top });
                }}
                onPointerLeave={() => setTip(undefined)}
                className={cn(
                  "relative flex h-full min-w-1.5 flex-1 flex-col items-center justify-end px-px pb-5",
                  tip?.index === i && "bg-foreground/5",
                )}
              >
                {/* the 2px gaps (px-px between columns, gap-0.5 between segments) separate the marks */}
                <div
                  className={cn(
                    "flex w-full max-w-6 flex-col gap-0.5",
                    tip?.index === i && "brightness-125",
                  )}
                  style={{ height: `${((bar.you + bar.squad) / top) * 100}%` }}
                >
                  {bar.squad > 0 && (
                    <div
                      className="min-h-0 basis-0 bg-chart-2 first:rounded-t-xs"
                      style={{ flexGrow: bar.squad }}
                    />
                  )}
                  {bar.you > 0 && (
                    <div
                      className="min-h-0 basis-0 bg-chart-1 first:rounded-t-xs"
                      style={{ flexGrow: bar.you }}
                    />
                  )}
                </div>
                {labelled.has(i) && (
                  <span
                    className={cn(
                      "absolute bottom-0 text-[11px] leading-5 whitespace-nowrap text-muted-foreground",
                      // a day column is wide, so its label sits under the bar; a match column is thin, so the label starts at it
                      group === "day" ? "left-1/2 -translate-x-1/2" : "left-0",
                    )}
                  >
                    {bar.day}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {active && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full border bg-popover px-3 py-2 text-xs whitespace-nowrap shadow-lg"
          style={{
            left: Math.min(Math.max(tip.x, 120), window.innerWidth - 120),
            top: tip.y - 8,
          }}
        >
          <div className="mb-1 text-muted-foreground">{active.title}</div>
          <div className="flex items-center gap-2">
            <span className="h-0.5 w-3 bg-chart-1" />
            <strong className="text-sm tabular-nums">
              {formatNumber(active.you)}
            </strong>
            <span className="text-muted-foreground">by you</span>
          </div>
          {includeSquad && (
            <div className="flex items-center gap-2">
              <span className="h-0.5 w-3 bg-chart-2" />
              <strong className="text-sm tabular-nums">
                {formatNumber(active.squad)}
              </strong>
              <span className="text-muted-foreground">by teammates</span>
            </div>
          )}
          <div className="mt-1 text-muted-foreground">{active.note}</div>
        </div>
      )}
    </div>
  );
}
