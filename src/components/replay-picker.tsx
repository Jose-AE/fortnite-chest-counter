import { RiCloseLine, RiUploadCloud2Line } from "@remixicon/react";
import { Button } from "@/components/ui/button";

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
  return (
    <>
      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onAdd(Array.from(e.dataTransfer.files));
        }}
        className="flex cursor-pointer flex-col items-center gap-2 border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-8 text-center transition-colors hover:border-primary hover:bg-primary/10 focus-within:border-primary"
      >
        <RiUploadCloud2Line className="size-8 text-primary" />
        <span className="font-semibold">Drop .replay files here</span>
        <span className="text-sm text-muted-foreground">
          or click to browse
        </span>
        <code className="mt-2 text-[11px] break-all text-muted-foreground">
          %LOCALAPPDATA%\FortniteGame\Saved\Demos
        </code>
        <input
          type="file"
          multiple
          accept=".replay"
          className="sr-only"
          disabled={disabled}
          onChange={(e) => {
            onAdd(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </label>

      {files.length > 0 && (
        <ul className="max-h-56 divide-y overflow-y-auto border bg-card text-sm">
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
