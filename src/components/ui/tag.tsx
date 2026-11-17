import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const tagVariants = cva(
  "rounded border px-1.5 py-0.5 text-xs leading-none whitespace-nowrap",
  {
    variants: {
      color: {
        primary: "text-primary",
        destructive: "text-destructive",
        muted: "text-muted-foreground",
      },
      variant: {
        soft: "border-current/40 bg-current/10",
        solid: "border-current bg-current",
        outline: "border-current/40 bg-transparent",
      },
    },
    defaultVariants: {
      color: "primary",
      variant: "soft",
    },
    compoundVariants: [
      {
        color: "primary",
        variant: "solid",
        className: "text-primary-foreground",
      },
      { color: "destructive", variant: "solid", className: "text-white" },
      { color: "muted", variant: "solid", className: "text-secondary" },
    ],
  },
);

function Tag({
  className,
  color,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof tagVariants>) {
  return (
    <span
      className={cn(tagVariants({ color, variant }), className)}
      {...props}
    />
  );
}

export { Tag };
