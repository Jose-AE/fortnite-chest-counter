import type { Match } from "@/types/match.types";

let api: Promise<{ Count(bytes: Uint8Array): string }> | undefined;

const loadApi = async () => {
  // `npm run build:wasm` puts the .NET runtime in public/_framework. A URL built at run time keeps Vite from rewriting the import.
  const url = new URL("/_framework/dotnet.js", location.href).href;
  const { dotnet } = await import(/* @vite-ignore */ url);
  const { getAssemblyExports, getConfig, runMain } = await dotnet.create();
  const exports = await getAssemblyExports(getConfig().mainAssemblyName);
  await runMain();
  return exports.Api;
};

// shortcut: parses on the main thread, so the page freezes per replay and a replay that never finishes hangs the tab; move to a Web Worker with a time limit if that happens
export async function parseReplay(file: File): Promise<Match> {
  if (file.size === 0) throw new Error("Empty file");
  api ??= loadApi();
  const json = (await api).Count(new Uint8Array(await file.arrayBuffer()));
  return { ...JSON.parse(json), fileName: file.name };
}
