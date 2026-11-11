// Runs the .NET chest counter off the main thread. Gets one File per message, answers { match } or { error }.
const loadApi = async (): Promise<{ Count(bytes: Uint8Array): string }> => {
  // `npm run build:wasm` puts the .NET runtime in public/_framework. A URL built at run time keeps Vite from rewriting the import.
  const url = new URL("/_framework/dotnet.js", location.href).href;
  const { dotnet } = await import(/* @vite-ignore */ url);
  const { getAssemblyExports, getConfig, runMain } = await dotnet.create();
  const exports = await getAssemblyExports(getConfig().mainAssemblyName);
  await runMain();
  return exports.Api;
};

// Start the runtime as the worker loads, and listen with addEventListener: dotnet.create() never finishes when it is first called from inside an onmessage handler.
const api = loadApi();
api.catch(() => {}); // a failed start is reported per file below

addEventListener("message", async ({ data: file }: MessageEvent<File>) => {
  try {
    const json = (await api).Count(new Uint8Array(await file.arrayBuffer()));
    postMessage({ match: JSON.parse(json) });
  } catch (e) {
    postMessage({ error: e instanceof Error ? e.message : String(e) });
  }
});
