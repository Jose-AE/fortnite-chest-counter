import type { Match } from "@/types/match.types";

// Some replays never finish parsing. A normal one takes a few seconds.
export const LIMIT_MS = 20_000;

// The replay hit the time limit. The page remembers these and does not try them again.
export class ReplayTimeout extends Error {}

// What the table shows for a failure reported by the .NET reader. Its own messages are codes such as
// "Arg_ArgumentOutOfRangeException" (publish strips the readable text), so only the ones we recognise are passed on.
const readable = (raw: string) =>
  /could not tell which player/i.test(raw)
    ? "Could not tell who recorded this replay"
    : /invalid replay/i.test(raw)
      ? "Not a Fortnite replay file"
      : /fetch|import|module|network/i.test(raw)
        ? "Could not load the replay reader. Check your connection and reload the page."
        : "Could not read this replay. It may be damaged or from a Fortnite version that is not supported yet.";

// How many replays to parse at once. Each runs its own .NET runtime, so this costs memory, and on a small CPU
// parallel parses slow each other toward LIMIT_MS: half the cores, at most 4.
export const PARALLEL = Math.max(
  1,
  Math.min(4, Math.floor((navigator.hardwareConcurrency || 2) / 2)),
);

const stops = new Set<(reason: Error) => void>();

// Gives up on every replay being parsed right now.
export const cancelParsing = () =>
  stops.forEach((stop) => stop(new Error("Cancelled")));

// Parses one replay in its own Web Worker. Several can run at once.
export function parseReplay(file: File): Promise<Match> {
  if (file.size === 0) return Promise.reject(new Error("Empty file"));
  // A fresh worker per replay: the .NET runtime's memory only grows, and one worker ran out after about 30 replays and then failed every file after that.
  const worker = new Worker(new URL("./parser.worker.ts", import.meta.url), {
    type: "module",
  });
  return new Promise((resolve, reject) => {
    const finish = () => {
      clearTimeout(timer);
      stops.delete(stop);
      worker.terminate(); // also the only way to interrupt a parser that is stuck
    };
    const stop = (reason: Error) => {
      finish();
      reject(reason);
    };
    stops.add(stop);
    const timer = setTimeout(
      () =>
        stop(
          new ReplayTimeout(`Skipped: took over ${LIMIT_MS / 1000} seconds`),
        ),
      LIMIT_MS,
    );
    worker.onmessage = ({ data }) => {
      finish();
      if (data.error) {
        console.warn(`${file.name}: ${data.error}`); // the raw reason, for bug reports
        reject(new Error(readable(data.error)));
      } else
        resolve({ ...data.match, fileName: file.name, fileSize: file.size });
    };
    worker.onerror = (e) => {
      console.warn(`${file.name}: ${e.message}`);
      stop(new Error(readable(e.message || "")));
    };
    worker.postMessage(file);
  });
}
