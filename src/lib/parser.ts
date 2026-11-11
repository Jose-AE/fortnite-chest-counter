import type { Match } from "@/types/match.types";

// Some replays never finish parsing. A normal one takes a few seconds.
const LIMIT_MS = 60_000;

let stop: ((reason: string) => void) | undefined;

// Gives up on the replay being parsed right now, if there is one.
export const cancelParsing = () => stop?.("Cancelled");

// Parses one replay in a Web Worker. Call it for one file at a time.
export function parseReplay(file: File): Promise<Match> {
  if (file.size === 0) return Promise.reject(new Error("Empty file"));
  // A fresh worker per replay: the .NET runtime's memory only grows, and one worker ran out after about 30 replays and then failed every file after that.
  const worker = new Worker(new URL("./parser.worker.ts", import.meta.url), {
    type: "module",
  });
  return new Promise((resolve, reject) => {
    const finish = () => {
      clearTimeout(timer);
      stop = undefined;
      worker.terminate(); // also the only way to interrupt a parser that is stuck
    };
    stop = (reason) => {
      finish();
      reject(new Error(reason));
    };
    const timer = setTimeout(
      () => stop?.(`Skipped: took over ${LIMIT_MS / 1000} seconds`),
      LIMIT_MS,
    );
    worker.onmessage = ({ data }) => {
      finish();
      if (data.error) reject(new Error(data.error));
      else
        resolve({ ...data.match, fileName: file.name, fileSize: file.size });
    };
    worker.onerror = (e) => stop?.(e.message || "The parser crashed");
    worker.postMessage(file);
  });
}
