import type { Match } from "@/types/match.types";

// Some replays never finish parsing. A normal one takes a few seconds.
const LIMIT_MS = 60_000;

let worker: Worker | undefined;
let stop: ((reason: string) => void) | undefined;

// Gives up on the replay being parsed right now, if there is one.
export const cancelParsing = () => stop?.("Cancelled");

// Parses one replay in a Web Worker. Call it for one file at a time: the worker answers in order.
export function parseReplay(file: File): Promise<Match> {
  if (file.size === 0) return Promise.reject(new Error("Empty file"));
  worker ??= new Worker(new URL("./parser.worker.ts", import.meta.url), {
    type: "module",
  });
  const current = worker;
  return new Promise((resolve, reject) => {
    const finish = () => {
      clearTimeout(timer);
      stop = undefined;
    };
    // A running parser cannot be interrupted, so kill the worker; the next file starts a fresh one.
    stop = (reason) => {
      finish();
      current.terminate();
      worker = undefined;
      reject(new Error(reason));
    };
    const timer = setTimeout(
      () => stop?.(`Skipped: took over ${LIMIT_MS / 1000} seconds`),
      LIMIT_MS,
    );
    current.onmessage = ({ data }) => {
      finish();
      if (data.error) reject(new Error(data.error));
      else resolve({ ...data.match, fileName: file.name });
    };
    current.onerror = (e) => stop?.(e.message || "The parser crashed");
    current.postMessage(file);
  });
}
