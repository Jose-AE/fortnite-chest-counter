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

  // With replays listed, the drop zone drops its icon and hints so the list fits in the height they took.
  const compact = files.length > 0;

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
        className={cn(
          "flex flex-col items-center gap-2 border-2 border-dashed border-primary/40 bg-primary/5 px-4 text-center",
          compact ? "py-4" : "py-8",
        )}
      >
        {!compact && <RiUploadCloud2Line className="size-8 text-primary" />}
        <span className="font-semibold">Drop replays or a folder here</span>
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            variant="outline"
            disabled={disabled}
            onClick={() => fileInput.current?.click()}
          >
            Choose files
          </Button>
          <Button
            variant="outline"
            disabled={disabled}
            onClick={() => folderInput.current?.click()}
          >
            Choose folder
          </Button>
        </div>
        {!compact && (
          <>
            <code className="mt-2 text-[11px] break-all text-muted-foreground">
              %LOCALAPPDATA%\FortniteGame\Saved\Demos
            </code>
            <span className="text-xs text-muted-foreground">
              Your browser may ask to "upload" a folder. The files stay on your
              device.
            </span>
          </>
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
        // fixed height on desktop: the space the hidden hints took, so the row beside it never changes height
        <ul className="max-h-38 divide-y overflow-y-auto border bg-card text-sm [scrollbar-color:--theme(--color-muted-foreground/50%)_transparent] scrollbar-thin lg:h-38">
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
      )}
    </>
  );
}
