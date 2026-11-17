import { cn } from "@/lib/utils";

function Tag({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-xs leading-none whitespace-nowrap text-primary",
        className,
      )}
      {...props}
    />
  );
}

export { Tag };
