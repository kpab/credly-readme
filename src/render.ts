import type { Badge } from "./credly.js";

export type SortOrder = "LATEST" | "OLDEST" | "NAME";

export interface RenderOptions {
  badgeWidth: number;
  emptyMessage: string;
  maxBadges: number;
  sort: SortOrder;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function compareDatesDesc(left: string, right: string): number {
  return Date.parse(right || "1970-01-01") - Date.parse(left || "1970-01-01");
}

function compareDatesAsc(left: string, right: string): number {
  return Date.parse(left || "1970-01-01") - Date.parse(right || "1970-01-01");
}

export function sortBadges(badges: Badge[], sort: SortOrder): Badge[] {
  const copied = [...badges];

  switch (sort) {
    case "LATEST":
      return copied.sort((left, right) => compareDatesDesc(left.issuedAtDate, right.issuedAtDate));
    case "OLDEST":
      return copied.sort((left, right) => compareDatesAsc(left.issuedAtDate, right.issuedAtDate));
    case "NAME":
      return copied.sort((left, right) => left.name.localeCompare(right.name, "en"));
    default:
      return copied;
  }
}

export function renderBadges(badges: Badge[], options: RenderOptions): string {
  const sorted = sortBadges(badges, options.sort);
  const limited = options.maxBadges > 0 ? sorted.slice(0, options.maxBadges) : sorted;

  if (limited.length === 0) {
    return options.emptyMessage;
  }

  return limited
    .map((badge) => {
      const escapedName = escapeHtml(badge.name);
      return `<a href="https://www.credly.com/badges/${badge.id}" title="${escapedName}"><img src="${badge.imageUrl}" width="${options.badgeWidth}" alt="${escapedName}" /></a>`;
    })
    .join(" ");
}
