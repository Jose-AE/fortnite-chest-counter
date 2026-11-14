import { useRef } from "react";
import { RiCloseLine, RiUploadCloud2Line } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

// Every file in a drop, including the files inside dropped folders (dataTransfer.files lists a folder as one empty entry).
async function droppedFiles(items: DataTransferItemList): Promise<File[]> {
  const walk = async (entry: FileSystemEntry): Promise<File[]> => {
    if (entry.isFile)
      return [
        await new Promise<File>((resolve, reject) =>
          (entry as FileSystemFileEntry).file(resolve, reject),
        ),
      ];
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const found: File[] = [];
    // readEntries hands back at most 100 entries per call, so keep asking until it returns none
    for (;;) {
      const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
        reader.readEntries(resolve, reject),
      );
      if (batch.length === 0) return found;
      for (const child of batch) found.push(...(await walk(child)));
    }
  };
  // the entries must be taken before the first await: the drop's items are emptied once the handler returns
  const picked = Array.from(items)
    .filter((item) => item.kind === "file")
    .map((item) => item.webkitGetAsEntry() ?? item.getAsFile()); // some drops have no entry, only the file
  return (
    await Promise.all(
      picked.map((p) => (p instanceof File ? [p] : p ? walk(p) : [])),
    )
  ).flat();
}

// The drop zone and the list of replays waiting to be counted.
export function ReplayPicker({
  files,
  disabled,
  onAdd,
  onRemove,
}: {
  files: File[];
  disabled: boolean;
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);

  // A folder can hold anything, so keep only the replays.
  const add = (picked: File[]) => {
    const replays = picked
      .filter((file) => file.name.toLowerCase().endsWith(".replay"))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (replays.length > 0) onAdd(replays);
    else if (picked.length > 0)
      toast.add({ type: "warning", title: "No .replay files found" });
  };
  const onPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    add(Array.from(e.target.files ?? []));
    e.target.value = ""; // so picking the same files again still fires
  };

  return (
    <>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (disabled) return;
          droppedFiles(e.dataTransfer.items).then(add, () =>
            toast.add({ type: "error", title: "Could not read that drop" }),
          );
        }}
        // empty: grows to fill the column beside the title (flex-1). With files: one compact row, so the list and button fit beside the title too
        className={cn(
          "flex items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/30 bg-black/15 px-4 text-center transition-colors hover:border-white/50",
          files.length > 0 ? "py-2.5" : "flex-1 flex-col py-5",
        )}
      >
        <RiUploadCloud2Line
          className={cn("text-primary", files.length > 0 ? "size-5" : "size-9")}
        />
        {files.length === 0 && (
          <span className="font-heading text-sm font-bold tracking-wide text-white/70 uppercase italic">
            Drop replays or a folder here
          </span>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            variant="ghost"
            className="bg-muted font-heading text-xs font-extrabold tracking-wide uppercase hover:bg-accent"
            disabled={disabled}
            onClick={() => fileInput.current?.click()}
          >
            Choose files
          </Button>
          <Button
            variant="ghost"
            className="bg-muted font-heading text-xs font-extrabold tracking-wide uppercase hover:bg-accent"
            disabled={disabled}
            onClick={() => folderInput.current?.click()}
          >
            Choose folder
          </Button>
        </div>
        {files.length === 0 && (
          <p className="text-xs text-muted-foreground">
            The files never leave your device. Replays are in
            <code className="mt-1 block text-white/80">
              %LOCALAPPDATA%\FortniteGame\Saved\Demos
            </code>
          </p>
        )}
        <input
          ref={fileInput}
          type="file"
          multiple
          accept=".replay"
          hidden
          onChange={onPicked}
        />
        <input
          ref={folderInput}
          type="file"
          hidden
          onChange={onPicked}
          // not in React's input types, but every desktop browser supports it
          {...{ webkitdirectory: "" }}
        />
      </div>

      {files.length > 0 && (
        // beside the title (lg) the list fills whatever height the title leaves, at least 38: it sits absolutely in its box, so 100 files never make the column taller
        <div className="relative lg:min-h-38 lg:flex-1">
        <ul className="max-h-38 divide-y overflow-y-auto rounded-md border bg-black/30 text-sm scrollbar-subtle lg:absolute lg:inset-0 lg:max-h-none">
          {files.map((file, i) => (
            <li key={i} className="flex items-center gap-2 px-3 py-2">
              <span className="flex-1 truncate">{file.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {(file.size / 1e6).toFixed(1)} MB
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${file.name}`}
                disabled={disabled}
                onClick={() => onRemove(i)}
              >
                <RiCloseLine />
              </Button>
            </li>
          ))}
        </ul>
        </div>
      )}
    </>
  );
}
