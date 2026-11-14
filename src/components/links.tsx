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

// The author's links, at the right end of the top bar.
export function Links() {
  return (
    <nav
      aria-label="Author links"
      className="flex gap-1"
    >
      {LINKS.map(({ label, href, icon: Icon }) => (
        <a
          key={href}
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={label}
          title={label}
          className="rounded-md p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:text-primary focus-visible:outline-none"
        >
          <Icon className="size-5" />
        </a>
      ))}
    </nav>
  );
}
