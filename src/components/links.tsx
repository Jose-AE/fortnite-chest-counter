import { RiCupFill, RiGithubFill } from "@remixicon/react";

const LINKS = [
  {
    label: "Source code on GitHub",
    href: "https://github.com/Jose-AE/fortnite-chest-counter",
    icon: RiGithubFill,
  },
  {
    label: "Buy me a coffee",
    href: "https://buymeacoffee.com/joseae",
    icon: RiCupFill,
  },
];

// The author's links, pinned to the bottom right corner of the page.
export function Links() {
  return (
    <nav
      aria-label="Author links"
      className="fixed right-0 bottom-0 z-30 m-2 flex gap-1 bg-card/80 p-1 ring-1 ring-foreground/10 backdrop-blur"
    >
      {LINKS.map(({ label, href, icon: Icon }) => (
        <a
          key={href}
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={label}
          title={label}
          className="p-1.5 text-muted-foreground transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none"
        >
          <Icon className="size-5" />
        </a>
      ))}
    </nav>
  );
}
