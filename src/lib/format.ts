// en-US so thousands always get a comma, whatever the visitor's locale: 3,603 and 36.4
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
export const formatNumber = (value: number) => number.format(value);

// 0.05098 -> "5.10%". Two decimals, because these chances are small and the change per match is in the decimals.
export const formatPercent = (fraction: number) =>
  fraction > 0 && fraction < 0.0001
    ? "<0.01%"
    : `${(fraction * 100).toFixed(2)}%`;

export const formatDateTime =(iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

export const formatDay = (iso: string | number) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

// "Playlist_NoBuildBR_Squad" -> "NoBuildBR Squad"
export const formatMode = (playlist: string) =>
  playlist.replace(/^Playlist_/, "").replaceAll("_", " ");

// 1073 -> "17:53"
export const formatLength = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
