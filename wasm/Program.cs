using System.Runtime.InteropServices.JavaScript;
using System.Text.Json.Nodes;
using Unreal.Core.Models.Enums;

Console.WriteLine("chest counter loaded");

partial class Api
{
    // Called from src/lib/parser.ts with the bytes of one replay. Returns one Match (src/types/match.types.ts) as JSON.
    // Throws on a replay it cannot read; the page shows that file as failed.
    [JSExport]
    internal static string Count(byte[] bytes)
    {
        var reader = new ChestReader(ParseMode.Normal, false);
        var replay = reader.ReadReplay(new MemoryStream(bytes));
        var me = reader.Me ?? throw new InvalidDataException("could not tell which player recorded this replay");
        var chests = reader.Events.Where(e => e.Opener != null && e.Class.Contains("Chest", StringComparison.OrdinalIgnoreCase)).ToList();
        var mine = chests.Where(e => e.Opener == me).ToList();
        var team = chests.Where(e => e.Opener != me && me.Team != null && e.Opener.Team == me.Team).ToList();
        return new JsonObject
        {
            ["matchId"] = replay.GameData?.GameSessionId ?? "",
            ["playlist"] = replay.GameData?.CurrentPlaylist ?? "",
            ["durationSeconds"] = (int)(replay.Info.LengthInMs / 1000),
            // The match start is UTC, so mark it with a Z. The file timestamp is local time, so leave it unmarked and the browser reads it as local.
            ["date"] = replay.GameData?.UtcTimeStartedMatch is { } utc
                ? DateTime.SpecifyKind(utc, DateTimeKind.Utc).ToString("o")
                : DateTime.SpecifyKind(replay.Info.Timestamp, DateTimeKind.Unspecified).ToString("o"),
            ["version"] = replay.Header?.Branch ?? "",
            ["chestCountSearched"] = mine.Count(e => !e.Destroyed),
            ["chestCountBroken"] = mine.Count(e => e.Destroyed),
            ["teamChestCountSearched"] = team.Count(e => !e.Destroyed),
            ["teamChestCountBroken"] = team.Count(e => e.Destroyed),
        }.ToJsonString();
    }
}
