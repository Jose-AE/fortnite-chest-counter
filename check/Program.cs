// Checks the chest counts of replays whose right answer is known. Replays are personal, so they live in the git-ignored archive/replays.
// Run with: dotnet run --project check -c Release   (takes about 5 minutes) Exit code 1 means a count changed: if the change is intended, update the expected number here.
using Unreal.Core.Models.Enums;

var replays = Path.GetFullPath(args.Length > 0 ? args[0] : Path.Combine(AppContext.BaseDirectory, "../../../../archive/replays"));
var failed = 0;

// A building collapse the recorder caused while solo: 9 chests broken by hand + 10 unopened chests in the collapse.
Expect("MASSIVE DES collapse", Count(Path.Combine(replays, "collapse", "MASSIVE DES.replay")), 19);

// A solo chest hunt: 10 opened + 46 broken + 25 buried chests dug up (buried chests have no bAlreadySearched field).
Expect("Full solo buried chests", Count(Path.Combine(replays, "collapse", "Full solo.replay")), 81);

// The 98 replays of Nov 6 to 10, none with a credited collapse: 2913 from before collapse credit existed,
// + 34 from UnsavedReplay-2026.11.06-23.06.25, which hung until the corrupt-packet guard,
// + 124 once a SearchingPawn field also marks a container (buried chests, and chests caught before their bAlreadySearched field arrives).
// UnsavedReplay-2026.11.10-12.42.49 is an empty file and is skipped.
var total = 0;
foreach (var file in Directory.GetFiles(replays, "*.replay"))
{
    var run = Task.Run(() => Count(file));
    try { if (run.Wait(TimeSpan.FromSeconds(120))) total += run.Result; }
    catch (AggregateException) { }
}
Expect("archive total", total, 3071);

return failed == 0 ? 0 : 1;

void Expect(string name, int actual, int expected)
{
    Console.WriteLine($"{(actual == expected ? "ok  " : "FAIL")} {name}: {actual} (expected {expected})");
    if (actual != expected) failed++;
}

// Chests the recorder opened or broke, counted the way Api.Count in wasm/Program.cs does.
static int Count(string file)
{
    var reader = new ChestReader(ParseMode.Normal, false);
    reader.ReadReplay(new MemoryStream(File.ReadAllBytes(file)));
    reader.CreditCollapses();
    var me = reader.Me ?? throw new InvalidDataException($"no recorder in {file}");
    return reader.Events.Count(e => e.Opener == me && e.Class.Contains("Chest", StringComparison.OrdinalIgnoreCase));
}
