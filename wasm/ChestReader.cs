// Reads one replay and records every chest loot event. Shared by the console counter and the browser build.
//
// How a replay records chests (found by reading the debug timeline of a v43.00 match):
// - bAlreadySearched goes true when a chest is opened and back to false when the game refills it, so one chest can be opened several times.
// - SearchingPawn is sent only when it changes. It names the opener, and also the player who destroys an unopened chest.
// - Destroying an unopened chest drops its loot, so it counts as a loot event too.
using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Text;
using FortniteReplayReader.Models.Events;
using FortniteReplayReader.Models.NetFieldExports;
using Unreal.Core;
using Unreal.Core.Contracts;
using Unreal.Core.Models;
using Unreal.Core.Models.Enums;

class Player { public uint StateId; public string EpicId; public int? Team; public bool Bot; public FVector Pos; }

class LootEvent { public double Time; public string Class; public bool Destroyed, InView; public Player Opener; }

class ChestState { public bool Searched, Destroyed; public Player Pawn; public LootEvent Pending; }

class ChestReader : FortniteReplayReader.ReplayReader
{
    public readonly Dictionary<uint, Player> Players = new(); // by player-state actor id
    public readonly List<LootEvent> Events = new();
    readonly Dictionary<uint, ChestState> chests = new();     // by container actor id, so one that re-replicates is not counted again
    readonly Dictionary<uint, uint> channelToActor = new(), pawnToState = new();
    readonly Dictionary<string, bool> isContainer = new();
    readonly HashSet<uint> freshChannels = new();
    readonly StringBuilder log = new();
    readonly bool debug;
    uint recorder;
    double time;

    public ChestReader(ParseMode mode, bool debug) : base(null, mode) { this.debug = debug; }

    public bool RecorderKnown => recorder != 0 && Players.ContainsKey(recorder);
    public Player Me => RecorderKnown ? Players[recorder] : null; // null when the replay does not name its recorder

    protected override void OnChannelOpened(uint channelIndex, NetworkGUID actor)
    {
        if (actor != null) channelToActor[channelIndex] = actor.Value; else channelToActor.Remove(channelIndex);
        freshChannels.Add(channelIndex);
        base.OnChannelOpened(channelIndex, actor);
    }

    protected override void OnExportRead(uint channelIndex, INetFieldExportGroup exportGroup)
    {
        switch (exportGroup)
        {
            case GameState gs:
                time = gs.ReplicatedWorldTimeSecondsDouble ?? gs.ReplicatedWorldTimeSeconds ?? time;
                if (gs.RecorderPlayerState?.Value is > 0) recorder = gs.RecorderPlayerState.Value;
                break;
            case FortPlayerState s when channelToActor.TryGetValue(channelIndex, out var id):
                if (!Players.TryGetValue(id, out var p)) Players[id] = p = new Player { StateId = id };
                p.EpicId = s.UniqueId ?? s.UniqueID ?? p.EpicId;
                p.Team = s.TeamIndex ?? p.Team;
                p.Bot |= s.bIsABot == true;
                break;
            case PlayerPawn pawn when channelToActor.TryGetValue(channelIndex, out var pawnId):
                // keyed by pawn actor id, not channel: channel numbers are reused when actors leave view
                if (pawn.PlayerState is > 0) pawnToState[pawnId] = pawn.PlayerState.Value;
                if (pawn.ReplicatedMovement is { } mv && PlayerOfPawn(pawnId) is { } owner) owner.Pos = mv.Location;
                break;
        }
        base.OnExportRead(channelIndex, exportGroup);
    }

    // Any class that replicates bAlreadySearched is a searchable container. Read those here by field name,
    // so every chest variant is covered without declaring a class per blueprint path.
    public override bool ReceiveProperties(FBitArchive archive, NetFieldExportGroup group, uint channelIndex, [NotNullWhen(returnValue: true)] out INetFieldExportGroup exportGroup, bool enablePropertyChecksum = true, bool netDeltaUpdate = false)
    {
        if (netDeltaUpdate || Channels[channelIndex] is null || !IsContainer(group))
            return base.ReceiveProperties(archive, group, channelIndex, out exportGroup, enablePropertyChecksum, netDeltaUpdate);

        exportGroup = null;
        if (enablePropertyChecksum) archive.ReadBit();
        bool? searched = null, destroyed = null; uint? pawn = null;
        while (true)
        {
            if (archive.IsError) return false; // a broken bunch never reaches the 0 terminator
            var handle = archive.ReadIntPacked();
            if (handle == 0) break;
            handle--;
            if (!group.IsValidIndex(handle)) return false;
            var export = group.NetFieldExports[handle];
            var numBits = (int)archive.ReadIntPacked();
            if (numBits == 0) continue;
            var left = archive.GetBitsLeft();
            switch (export?.Name)
            {
                case "bAlreadySearched": searched = archive.ReadBit(); break;
                case "bDestroyed": destroyed = archive.ReadBit(); break;
                case "SearchingPawn": pawn = archive.ReadIntPacked(); break;
            }
            var used = left - archive.GetBitsLeft();
            if (numBits > used) archive.SkipBits(numBits - used);
        }
        OnContainer(channelIndex, group.PathName, searched, destroyed, pawn);
        return true;
    }

    bool IsContainer(NetFieldExportGroup group)
    {
        if (!isContainer.TryGetValue(group.PathName, out var yes))
            isContainer[group.PathName] = yes = group.NetFieldExports.Any(e => e?.Name == "bAlreadySearched");
        return yes;
    }

    // A class's field list arrives piece by piece, so a "not a container" answer can go stale: forget the answers when the field shows up.
    public override NetFieldExport ReadNetFieldExport(FArchive archive)
    {
        var export = base.ReadNetFieldExport(archive);
        if (export?.Name == "bAlreadySearched") isContainer.Clear();
        return export;
    }

    void OnContainer(uint channelIndex, string cls, bool? searched, bool? destroyed, uint? pawn)
    {
        // shortcut: falls back to the channel index when the actor id is unknown, could double count; fix if totals look inflated
        var key = channelToActor.TryGetValue(channelIndex, out var actorId) ? actorId : 0x80000000 | channelIndex;
        var name = cls[(cls.LastIndexOf('.') + 1)..];
        if (!chests.TryGetValue(key, out var chest)) chests[key] = chest = new ChestState();
        var opened = freshChannels.Remove(channelIndex);
        LootEvent made = null;

        // The pawn is 0 while that player is out of view, then re-sent when they return: 0 means "unknown", not "nobody",
        // and not "the previous opener" either, or a refilled chest reopened out of view would be credited to whoever opened it before.
        if (pawn != null)
        {
            chest.Pawn = pawn > 0 ? PlayerOfPawn(pawn.Value) : null; // also null when that pawn cannot be matched to a player
            if (chest.Pending != null && chest.Pawn != null) { chest.Pending.Opener = chest.Pawn; chest.Pending = null; } // opener arrived after the open itself
        }
        if (searched == false) { chest.Searched = false; chest.Pending = null; } // refilled
        if (destroyed == false) chest.Destroyed = false;
        if (searched == true && !chest.Searched)
        {
            chest.Searched = true;
            made = new LootEvent { Time = time, Class = name, Opener = chest.Pawn };
        }
        if (destroyed == true && !chest.Destroyed)
        {
            chest.Destroyed = true;
            // Only an update that names a pawn tells us a player did it; a chest opened earlier was already counted.
            if (!chest.Searched && made == null) made = new LootEvent { Time = time, Class = name, Destroyed = true, Opener = pawn is > 0 ? chest.Pawn : null };
        }
        if (made != null)
        {
            made.InView = !opened; // happened while the recorder could see it, as opposed to coming into view already looted
            Events.Add(made);
            if (made.Opener == null && !made.Destroyed) chest.Pending = made;
        }

        if (debug && (searched != null || destroyed != null || pawn != null))
            log.AppendLine($"{time,9:F1} {(opened ? "NEW" : "   ")} {key,10} {name,-32} searched={B(searched)} destroyed={B(destroyed)} pawn={pawn?.ToString() ?? "-"} -> {Who(pawn)}"
                + (made == null ? "" : $"   ==> {(made.Destroyed ? "DESTROYED" : "OPENED")} by {Tag(made.Opener)}"));
    }

    Player PlayerOfPawn(uint pawnId) => pawnToState.TryGetValue(pawnId, out var s) && Players.TryGetValue(s, out var p) ? p : null;

    static string B(bool? b) => b == null ? "-" : b.Value ? "1" : "0";
    string Tag(Player p) => p == null ? "unknown" : $"{(p.StateId == recorder ? "RECORDER" : p.Bot ? "bot" : "player")}/team{p.Team}/{p.EpicId}";
    string Who(uint? pawnId) => pawnId is null or 0 ? "none" : PlayerOfPawn(pawnId.Value) is { } p ? $"{Tag(p)}@{V(p.Pos)}" : $"unresolved({pawnId})";
    static string V(FVector v) => v == null ? "?" : $"({v.X / 100:F0},{v.Y / 100:F0},{v.Z / 100:F0})";

    public string DebugDump()
    {
        var me = Me;
        var sb = new StringBuilder();
        sb.AppendLine($"recorder state id {recorder} -> {Tag(me)}");
        sb.AppendLine($"== PLAYERS ({Players.Count})");
        foreach (var p in Players.Values.OrderBy(p => p.Team)) sb.AppendLine($"state {p.StateId} {Tag(p)}");
        sb.AppendLine("== LOOT EVENTS BY MY SQUAD");
        foreach (var e in Events.Where(e => e.Opener != null && me != null && e.Opener.Team == me.Team))
            sb.AppendLine($"{e.Time,9:F1} {(e.Destroyed ? "DESTROYED" : "OPENED   ")} {e.Class,-32} {Tag(e.Opener)}");
        sb.AppendLine("== TIMELINE of container updates (time is server world seconds; positions in metres; '-' = field not in this update)");
        sb.Append(log);
        return sb.ToString();
    }

    // .NET has no AES in the browser, so decrypt there with our own code. Everywhere else the library's version runs.
    protected override FArchive DecryptBuffer(FArchive archive, int size)
    {
        if (!OperatingSystem.IsBrowser() || !Replay.Info.IsEncrypted) return base.DecryptBuffer(archive, size);
        var plain = AesEcb.Decrypt(Replay.Info.EncryptionKey.ToArray(), archive.ReadMemory(size).Span);
        return new Unreal.Core.BinaryReader(plain.AsMemory())
        {
            EngineNetworkVersion = archive.EngineNetworkVersion,
            NetworkVersion = archive.NetworkVersion,
            ReplayHeaderFlags = archive.ReplayHeaderFlags,
            ReplayVersion = archive.ReplayVersion
        };
    }

    // The kill feed layout changes between builds; chests do not need it.
    public override PlayerElimination ParseElimination(FArchive archive, EventInfo info)
    {
        try { return base.ParseElimination(archive, info); }
        catch { return new PlayerElimination { Info = info }; }
    }
}
