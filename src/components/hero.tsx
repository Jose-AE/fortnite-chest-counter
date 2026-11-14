import { SettingsDialog } from "@/components/settings-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatCount,
  formatDay,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { chestsForEvenChance, tokenChance, type Summary } from "@/lib/stats";
import { cn } from "@/lib/utils";
import type { Settings } from "@/types/settings.types";

// A filter pill with a count badge; the chosen one is white.
function Pill({
  on,
  count,
  onClick,
  children,
}: {
  on: boolean;
  count?: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "flex h-9 items-center gap-1.5 rounded-sm px-2 font-heading text-sm whitespace-nowrap sm:gap-2 sm:px-3 sm:text-base font-extrabold tracking-wide uppercase transition-colors",
        on ? "bg-white text-black shadow-sm" : "text-white/70 hover:text-white",
      )}
    >
      {children}
      {count !== undefined && (
        <span
          className={cn(
            "rounded px-1.5 py-0.5 font-sans text-[11px] leading-none font-bold tabular-nums",
            on ? "bg-black/12" : "bg-black/30",
          )}
        >
          {formatNumber(count)}
        </span>
      )}
    </button>
  );
}

// The page title, the totals line under it and the you / with-teammates switch.
// Before anything is counted the total is a real 0, shown dimmed so it reads as "nothing yet".
export function Hero({
  summary,
  failed,
  includeSquad,
  onIncludeSquad,
  settings,
  onSettings,
}: {
  summary: Summary;
  failed: number;
  includeSquad: boolean;
  onIncludeSquad: (value: boolean) => void;
  settings: Settings;
  onSettings: (settings: Settings) => void;
}) {
  // extra chests alone are enough to show a total and a chance
  const counted = summary.total > 0;
  const from = formatDay(summary.from);
  const to = formatDay(summary.to);
  const total = formatNumber(summary.total);
  const odds = settings.tokenOdds;
  const chance = tokenChance(summary.total, odds);
  const oddsChanged = odds !== DEFAULT_SETTINGS.tokenOdds;
  const hasChips = counted && (oddsChanged || summary.extraChests > 0 || failed > 0);

  return (
    // the chips already part the sentence from the switch, so with them the switch sits closer
    <div
      className={cn(
        "@container flex flex-col items-center text-center lg:items-start lg:text-left",
        hasChips ? "gap-4" : "gap-7",
      )}
    >
      {/* the number is the headline: what the page is for */}
      <div className="flex flex-col gap-3 font-heading uppercase">
        <p className="text-lg leading-none font-extrabold tracking-wide text-white/60">
          {summary.matchCount > 0
            ? `${from === to ? from : `${from} to ${to}`} · ${formatCount(summary.matchCount, "match")}`
            : "Add your replays to start"}
        </p>
        <p className="flex flex-wrap items-baseline justify-center gap-x-4 lg:justify-start">
          <span
            key={String(counted)}
            className={cn(
              // black italic (900), with a shadow down and to the right; pr-2 keeps the slanted last digit from touching "Chests"
              "animate-in pr-2 [--size:6rem] leading-[0.85] font-black  italic text-primary mb-4 [text-shadow:4px_5px_0_rgb(0_0_0/45%)] duration-500 fade-in slide-in-from-bottom-2 lg:[--size:10rem]",
              !counted && "opacity-40",
            )}
            // full size while it fits; a longer number shrinks to the hero's width (cqw). Each character measures about 0.53em in this face; 0.66 leaves room for the italic overhang and a gap before the replay picker
            style={{
              fontSize: `min(var(--size), ${(100 / (total.length * 0.66)).toFixed(2)}cqw)`,
            }}
          >
            {total}
          </span>
          <span className="text-4xl leading-none font-black [text-shadow:0_3px_0_rgb(0_0_0/35%)] sm:text-5xl">
            {/* the same word in both modes, so switching only changes the number; the pill shows which mode is on */}
            Chests
          </span>
        </p>
        {counted && (
          <p className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-2.5 text-lg font-extrabold text-white/55 sm:text-xl lg:justify-start">
            <Tooltip>
              {/* a button, so the explanation also opens on keyboard focus */}
              <TooltipTrigger
                delay={100}
                className="cursor-help font-black text-white tabular-nums underline decoration-white/30 decoration-dotted decoration-1 underline-offset-[5px]"
              >
                {formatPercent(chance)}
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="block max-w-sm space-y-2 py-3 text-left font-sans text-xs/relaxed normal-case"
              >
                <p>
                  <strong>Every chest is its own roll.</strong> Each one has a 1
                  in {formatNumber(odds)} chance, and chests do not add up
                  towards a guaranteed token.
                </p>
                <p>
                  The chance that none of your {total} chests dropped one is (
                  {formatNumber(odds - 1)} ÷ {formatNumber(odds)}) multiplied by
                  itself {total} times, which is {formatPercent(1 - chance)}. So
                  the chance that at least one did is 100% −{" "}
                  {formatPercent(1 - chance)} ={" "}
                  <strong>{formatPercent(chance)}</strong>.
                </p>
                <p>
                  After {formatNumber(odds)} chests the chance is{" "}
                  {formatPercent(tokenChance(odds, odds))}, not 100%. A 50%
                  chance takes about {formatNumber(chestsForEvenChance(odds))}{" "}
                  chests.
                </p>
                {includeSquad && (
                  <p>
                    Teammate chests are only counted when they were opened near
                    you, so your real chance is a little higher.
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
            <span>chance one dropped a shop token</span>
            {/* a chip of its own, so it wraps as one piece instead of pushing the sentence onto two ragged lines */}
            {/* the notes that adjust the number sit together under it, as chips: no extra row under the switch to throw off the layout */}
            {hasChips && (
              <span className="flex basis-full flex-wrap justify-center gap-2 lg:justify-start">
                {oddsChanged && (
                  // purple, so a changed setting reads apart from the gold "by hand" chip, which changes the count itself
                  <span className="rounded border border-[#a58df5]/40 bg-[#a58df5]/10 px-1.5 py-0.5 text-xs leading-none whitespace-nowrap text-[#a58df5]">
                    Custom odds
                  </span>
                )}
                {summary.extraChests > 0 && (
                  <span
                    title={`Includes ${formatCount(summary.extraChests, "chest")} added by hand`}
                    className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-xs leading-none whitespace-nowrap text-primary"
                  >
                    +{formatNumber(summary.extraChests)} by hand
                  </span>
                )}
                {failed > 0 && (
                  <Badge variant="destructive">{failed} not counted</Badge>
                )}
              </span>
            )}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
        {/* one switch: both sides share a track, the white side is the one on */}
        <div className="flex items-center gap-0.5 rounded-md border border-white/10 bg-black/30 p-1">
          <Pill
            on={!includeSquad}
            count={summary.byYou}
            onClick={() => onIncludeSquad(false)}
          >
            Just you
          </Pill>
          <Tooltip>
            {/* a span as the trigger: the pill inside is already a button */}
            <TooltipTrigger delay={100} render={<span className="flex" />}>
              <Pill
                on={includeSquad}
                count={summary.byYou + summary.teammates}
                onClick={() => onIncludeSquad(true)}
              >
                With teammates
              </Pill>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              className="block max-w-xs py-2 text-left text-xs/relaxed"
            >
              Adds the chests your teammates opened. A replay only records what
              happened near you, so chests they opened far away from you are not
              counted. The real number is probably higher.
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="grid size-[46px] place-items-center rounded-md border border-white/10 bg-black/30">
          <SettingsDialog settings={settings} onChange={onSettings} />
        </div>
      </div>

      {/* before anything is counted the chip row above is hidden, so a failed first count still shows here */}
      {!counted && failed > 0 && (
        <p className="flex justify-center lg:justify-start">
          <Badge variant="destructive">{failed} not counted</Badge>
        </p>
      )}
    </div>
  );
}
