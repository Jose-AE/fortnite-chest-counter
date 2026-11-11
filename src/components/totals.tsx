import { RiKey2Line, RiTeamLine } from "@remixicon/react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

// The big total and the two tiles under it. Shows "?" until a match has been counted.
export function Totals({
  opened,
  squad,
  includeSquad,
  matchCount,
  failed,
}: {
  opened: number;
  squad: number; // already 0 when squad opens are not included
  includeSquad: boolean;
  matchCount: number;
  failed: number;
}) {
  const counted = matchCount > 0;
  const show = (value: number) => (counted ? value : "?");

  return (
    <>
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
          {counted
            ? `across ${matchCount} matches`
            : "Add replays and press Count chests."}
          {failed > 0 && (
            <Badge variant="destructive">{failed} not counted</Badge>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Tile icon={RiKey2Line} label="Opened by you" value={show(opened)} />
        <Tile
          icon={RiTeamLine}
          label="Squad opens"
          value={show(squad)}
          off={!includeSquad}
        />
      </div>
    </>
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
