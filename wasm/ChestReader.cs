// Reads one replay and records every chest loot event. Shared by the console counter and the browser build.
//
// How a replay records chests (found by reading the debug timeline of a v43.00 match):
// - bAlreadySearched goes true when a chest is opened and back to false when the game refills it, so one chest can be opened several times.
// - SearchingPawn is sent only when it changes. It names the opener, and also the player who destroys an unopened chest.
// - Destroying an unopened chest drops its loot, so it counts as a loot event too. Digging up a buried chest looks the same.
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

class LootEvent { public double Time; public string Class, Group; public bool Destroyed, InView, NoPawn; public Player Opener; }

class ChestState { public bool Searched, Destroyed; public Player Pawn; public LootEvent Pending; }

class ChestReader : FortniteReplayReader.ReplayReader
{
    public readonly Dictionary<uint, Player> Players = new(); // by player-state actor id
    public readonly List<LootEvent> Events = new();
    readonly Dictionary<string, ChestState> chests = new();   // by ChestKey, so a chest that reloads under a new actor id is not counted again
    readonly Dictionary<uint, string> channelKey = new();
    readonly Dictionary<uint, uint> channelToActor = new(), pawnToState = new();
    readonly Dictionary<string, Kind> kinds = new();
    readonly HashSet<uint> freshChannels = new();
    readonly Dictionary<uint, uint> channelOwner = new();                // weapon/backpack channel -> owning pawn; Owner is sent only when the actor loads
    public readonly List<(double Time, uint Pawn)> Swings = new();       // pickaxe swings, by pawn
    readonly List<(double Time, uint Pawn, bool Tiger)> sprites = new(); // sprite worn on the back, by pawn
    enum Kind { None, Container, Pickaxe, Backpack }
    readonly StringBuilder log = new();
    readonly bool debug;
    uint recorder;
    double time;
    int opensSinceData;

    public ChestReader(ParseMode mode, bool debug) : base(null, mode) { this.debug = debug; }

    public bool RecorderKnown => recorder != 0 && Players.ContainsKey(recorder);
    public Player Me => RecorderKnown ? Players[recorder] : null; // null when the replay does not name its recorder

    protected override void OnChannelOpened(uint channelIndex, NetworkGUID actor)
    {
        // A corrupt packet can make the library reopen a channel forever (UnsavedReplay-2026.11.06-23.06.25 did, 158 million times).
        // Throwing makes it drop that packet and carry on, and the rest of the match reads fine.
        if (++opensSinceData > 100_000) { opensSinceData = 0; throw new InvalidDataException("corrupt packet: channel reopened without data"); }
        if (actor != null) channelToActor[channelIndex] = actor.Value; else channelToActor.Remove(channelIndex);
        channelKey.Remove(channelIndex);
        channelOwner.Remove(channelIndex);
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

    // Any class that replicates bAlreadySearched or SearchingPawn is a searchable container. Read those here by field name,
    // (buried chests have no bAlreadySearched: digging one up sends bDestroyed with the digger as SearchingPawn)
    // so every chest variant is covered without declaring a class per blueprint path.
    // Pickaxes and sprite backpacks are read the same way, to tell who caused a building collapse (see CreditCollapses).
    public override bool ReceiveProperties(FBitArchive archive, NetFieldExportGroup group, uint channelIndex, [NotNullWhen(returnValue: true)] out INetFieldExportGroup exportGroup, bool enablePropertyChecksum = true, bool netDeltaUpdate = false)
    {
        opensSinceData = 0;
        var kind = netDeltaUpdate || Channels[channelIndex] is null ? Kind.None : KindOf(group);
        if (kind == Kind.None)
            return base.ReceiveProperties(archive, group, channelIndex, out exportGroup, enablePropertyChecksum, netDeltaUpdate);

        exportGroup = null;
        if (enablePropertyChecksum) archive.ReadBit();
        bool? searched = null, destroyed = null; uint? pawn = null, owner = null, sprite = null;
        bool swung = false;
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
                case "Owner": owner = archive.ReadIntPacked(); break;
                case "ExtractableItemDefinition": sprite = archive.ReadIntPacked(); break;
                case "BlendingOutPawnMontage": swung = true; break; // sent at the end of each pickaxe swing
            }
            var used = left - archive.GetBitsLeft();
            if (numBits > used) archive.SkipBits(numBits - used);
        }
        switch (kind)
        {
            case Kind.Container: OnContainer(channelIndex, group.PathName, searched, destroyed, pawn); break;
            case Kind.Pickaxe: OnPickaxe(channelIndex, owner, swung); break;
            case Kind.Backpack: OnBackpack(channelIndex, owner, sprite); break;
        }
        return true;
    }

    Kind KindOf(NetFieldExportGroup group)
    {
        if (kinds.TryGetValue(group.PathName, out var kind)) return kind;
        var path = group.PathName;
        kind = group.NetFieldExports.Any(e => e?.Name is "bAlreadySearched" or "SearchingPawn") ? Kind.Container
            : path.Contains("ExtractionBackpack") ? Kind.Backpack
            : path.Contains("Pickaxe") ? Kind.Pickaxe
            : Kind.None;
        return kinds[path] = kind;
    }

    // A class's field list arrives piece by piece, so a "not a container" answer can go stale: forget the answers when the field shows up.
    public override NetFieldExport ReadNetFieldExport(FArchive archive)
    {
        var export = base.ReadNetFieldExport(archive);
        if (export?.Name is "bAlreadySearched" or "SearchingPawn") kinds.Clear();
        return export;
    }

    void OnPickaxe(uint channelIndex, uint? owner, bool swung)
    {
        var opened = freshChannels.Remove(channelIndex); // the first update after loading replays old state, not a new swing
        if (owner is > 0) channelOwner[channelIndex] = owner.Value;
        if (swung && !opened && channelOwner.TryGetValue(channelIndex, out var pawn)) Swings.Add((time, pawn));
    }

    void OnBackpack(uint channelIndex, uint? owner, uint? sprite)
    {
        freshChannels.Remove(channelIndex);
        if (owner is > 0) channelOwner[channelIndex] = owner.Value;
        if (sprite is > 0 && channelOwner.TryGetValue(channelIndex, out var pawn))
            sprites.Add((time, pawn, PathOf(sprite.Value)?.Contains("WhiteTiger") == true));
    }

    void OnContainer(uint channelIndex, string cls, bool? searched, bool? destroyed, uint? pawn)
    {
        var name = cls[(cls.LastIndexOf('.') + 1)..];
        var key = ChestKey(channelIndex, name);
        if (!chests.TryGetValue(key, out var chest)) chests[key] = chest = new ChestState();
        var opened = freshChannels.Remove(channelIndex);
        LootEvent made = null;
        // A chest's first update after it loads carries its full state, so no pawn there means no opener we can name, not "unchanged".
        if (opened && pawn == null) chest.Pawn = null;

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
            made.Group = GroupOf(key);
            made.NoPawn = pawn == null;
            made.InView = !opened; // happened while the recorder could see it, as opposed to coming into view already looted
            Events.Add(made);
            // Only an open seen happening can wait for a late opener; a chest that arrives already looted would otherwise go to whoever touches it next.
            if (made.Opener == null && !made.Destroyed && made.InView) chest.Pending = made;
        }

        if (debug && (searched != null || destroyed != null || pawn != null))
            log.AppendLine($"{time,9:F1} {(opened ? "NEW" : "   ")} {key,10} {name,-32} searched={B(searched)} destroyed={B(destroyed)} pawn={pawn?.ToString() ?? "-"} -> {Who(pawn)}"
                + (made == null ? "" : $"   ==> {(made.Destroyed ? "DESTROYED" : "OPENED")} by {Tag(made.Opener)}"));
    }

    // A building collapse destroys its chests with no SearchingPawn, and buildings do not record who damaged them,
    // so the replay never says who caused it. A collapse is 3+ unopened chests in one map group, each within 10 s of the last.
    public void CreditCollapses()
    {
        var me = Me;
        if (me == null) return;
        var orphans = Events.Where(e => e.Destroyed && e.Opener == null && e.NoPawn && e.InView && e.Group != null).OrderBy(e => e.Time);
        foreach (var group in orphans.GroupBy(e => e.Group))
        {
            var run = new List<LootEvent>();
            foreach (var e in group.Append(null)) // null flushes the last run
            {
                if (e != null && (run.Count == 0 || e.Time - run[^1].Time <= 10)) { run.Add(e); continue; }
                if (run.Count >= 3) { var who = CollapseCause(run[0].Time, me); foreach (var x in run) x.Opener = who; }
                run.Clear();
                if (e != null) run.Add(e);
            }
        }
    }

    public const double SwingWindow = 6; // seconds from the last pickaxe hit to the first chest breaking; seen 0 to 4 s

    // Credit the squad member who was swinging a pickaxe just before the collapse (shots are mostly NPCs firing, so they are ignored).
    // Several squad swingers: prefer whoever wears the White Tiger sprite, which one-shots structures, then whoever swung last.
    // Only enemies swinging: nobody. Nobody swinging: the squad member wearing White Tiger, if that is clear.
    // shortcut: buildings do not record who hit them, so an enemy White Tiger landing the last hit while the squad is also swinging still counts for the squad; no fix without that data
    Player CollapseCause(double start, Player me)
    {
        bool Squad(Player p) => p == me || (me.Team != null && p.Team == me.Team);
        var tigers = sprites.Where(s => s.Time <= start).GroupBy(s => PlayerOfPawn(s.Pawn))
            .Where(g => g.Key != null && Squad(g.Key) && g.Last().Tiger).Select(g => g.Key).ToList();
        var swingers = Swings.Where(a => a.Time <= start && a.Time >= start - SwingWindow).Select(a => PlayerOfPawn(a.Pawn)).Where(p => p != null).ToList();
        var squad = swingers.Where(Squad).ToList();
        if (squad.Count > 0) return squad.LastOrDefault(tigers.Contains) ?? squad[^1];
        if (swingers.Count > 0) return null;
        return tigers.Contains(me) ? me : tigers.Count == 1 ? tigers[0] : null;
    }

    // A map chest's path ends "_UAID_<id>_<group>_<n>"; the group is shared by the chests of one area. Null for chests without one.
    static string GroupOf(string key)
    {
        var parts = key.Split('_');
        var i = Array.IndexOf(parts, "UAID");
        return i >= 0 && parts.Length - i == 4 ? parts[i + 2] : null;
    }

    // When the recorder leaves an area and comes back, its chests reload under new actor ids, already looted.
    // So name a chest by something that survives the reload: a map chest's path name, or a spawned chest's class and X/Y
    // (not Z: a buried chest rises when dug up).
    string ChestKey(uint channelIndex, string name)
    {
        if (channelKey.TryGetValue(channelIndex, out var key)) return key;
        // shortcut: falls back to the channel index when the actor id is unknown, could double count; fix if totals look inflated
        if (!channelToActor.TryGetValue(channelIndex, out var id)) return $"channel {channelIndex}";
        key = PathOf(id) ?? (Channels[channelIndex]?.Actor?.Location is { } at ? $"{name} @{Math.Round(at.X / 100)},{Math.Round(at.Y / 100)}" : $"actor {id}");
        return channelKey[channelIndex] = key;
    }

    // The library keeps actor path names private, so read them by reflection; null if a library update renames them.
    static readonly System.Reflection.FieldInfo guidCache = typeof(FortniteReplayReader.ReplayReader).BaseType?.GetField("_netGuidCache", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic);
    string PathOf(uint id) => guidCache?.GetValue(this) is { } cache && cache.GetType().GetProperty("NetGuidToPathName")?.GetValue(cache) is Dictionary<uint, string> paths && paths.TryGetValue(id, out var path) ? path : null;

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
