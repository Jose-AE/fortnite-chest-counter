import { SettingsDialog } from "@/components/settings-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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

// Before anything is counted the total is a real 0, shown dimmed so it reads as "nothing yet".

// The one big number, and the switch that decides whether teammates' chests are part of it.
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
  const commas = total.split(",").length - 1;
  const digits = total.length - commas;
  const odds = settings.tokenOdds;
  const chance = tokenChance(summary.total, odds);
  const oddsChanged = odds !== DEFAULT_SETTINGS.tokenOdds;

  return (
    <Card className="justify-between">
      <CardHeader>
        <CardDescription className="tracking-widest uppercase">
          Total chests
        </CardDescription>
        <CardAction className="flex items-center gap-3">
          <Tooltip>
            {/* the label itself is the trigger: a button here would wrap the checkbox, which is already one */}
            <TooltipTrigger
              delay={100}
              render={
                <label className="flex cursor-pointer items-center gap-2 text-sm" />
              }
            >
              <Checkbox
                checked={includeSquad}
                onCheckedChange={onIncludeSquad}
              />
              Include teammate chests
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              align="end"
              className="block max-w-xs py-2 text-left text-xs/relaxed"
            >
              Adds the chests your teammates opened. A replay only records what
              happened near you, so chests they opened far away from you are
              not counted. The real number is probably higher.
            </TooltipContent>
          </Tooltip>
          <SettingsDialog settings={settings} onChange={onSettings} />
        </CardAction>
      </CardHeader>
      {/* The middle of three rows, so the card's justify-between centres it between the label and the footer line. */}
      {/* Fixed second column and fixed wording: only the two numbers change when the checkbox is toggled, nothing moves. */}
      <CardContent>
        <div className="grid items-center gap-x-10 gap-y-4 md:grid-cols-[minmax(0,1fr)_20rem]">
          {/* a container, so the number's size can follow this column's width (the cqw unit below) */}
          <div className="@container min-w-0">
            <CardTitle
              key={String(counted)}
              className={cn(
                "animate-in leading-none font-black tracking-tighter whitespace-nowrap text-primary duration-500 fade-in slide-in-from-bottom-4",
                !counted && "opacity-30",
              )}
              // Full size (8rem) while the number fits its column, smaller as it gains digits.
              // A digit is about 0.62em wide in this font and a comma about 0.25em.
              style={{
                fontSize: `min(8rem, calc(100cqw / ${digits * 0.62 + commas * 0.25}))`,
              }}
            >
              {total}
            </CardTitle>
          </div>
          {counted && (
            <div className="border-l-2 border-primary/40 pl-4">
              <div className="text-xs tracking-widest text-muted-foreground uppercase">
                Shop token chance
              </div>
              <Tooltip>
                {/* a button, so the explanation also opens on keyboard focus */}
                <TooltipTrigger
                  delay={100}
                  className="cursor-help text-5xl font-black tabular-nums underline decoration-muted-foreground/40 decoration-dotted decoration-2 underline-offset-8"
                >
                  {formatPercent(chance)}
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="block max-w-sm space-y-2 py-3 text-left text-xs/relaxed"
                >
                  <p>
                    <strong>Every chest is its own roll.</strong> Each one has
                    a 1 in {formatNumber(odds)} chance, and chests do not
                    add up towards a guaranteed token.
                  </p>
                  <p>
                    The chance that none of your {total} chests dropped one is
                    ({formatNumber(odds - 1)} ÷ {formatNumber(odds)}
                    ) multiplied by itself {total} times, which is{" "}
                    {formatPercent(1 - chance)}. So the chance that at least
                    one did is 100% − {formatPercent(1 - chance)} ={" "}
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
                      Teammate chests are only counted when they were opened
                      near you, so your real chance is a little higher.
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
              <p className="mt-1 text-xs/relaxed text-muted-foreground">
                The chance that at least one of these chests dropped a token, at
                1 in {formatNumber(odds)}
                {oddsChanged && " (custom odds)"} per chest.
              </p>
            </div>
          )}
        </div>
      </CardContent>
      <CardContent className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {summary.matchCount > 0 &&
          `across ${formatCount(summary.matchCount, "match")}, ${from === to ? from : `${from} to ${to}`}`}
        {summary.matchCount > 0 && summary.extraChests > 0 && ", "}
        {summary.extraChests > 0 &&
          `including ${formatCount(summary.extraChests, "chest")} added by hand`}
        {!counted && "Add replays and press Count chests."}
        {failed > 0 && (
          <Badge variant="destructive">{failed} not counted</Badge>
        )}
      </CardContent>
    </Card>
  );
}
