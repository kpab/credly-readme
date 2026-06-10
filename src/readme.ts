import { readFile, writeFile } from "node:fs/promises";

function createMarkers(sectionName: string): { start: string; end: string } {
  return {
    start: `<!--START_SECTION:${sectionName}-->`,
    end: `<!--END_SECTION:${sectionName}-->`,
  };
}

export function replaceSectionContent(
  content: string,
  sectionName: string,
  replacement: string,
): string {
  const { start, end } = createMarkers(sectionName);
  const escapedStart = start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedEnd = end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(${escapedStart}\\s*)([\\s\\S]*?)(\\s*${escapedEnd})`, "m");

  if (!pattern.test(content)) {
    throw new Error(`Markers for section "${sectionName}" were not found in README.`);
  }

  return content.replace(pattern, `$1${replacement}$3`);
}

export async function updateReadmeFile(
  readmePath: string,
  sectionName: string,
  replacement: string,
): Promise<{ before: string; after: string; changed: boolean }> {
  const before = await readFile(readmePath, "utf8");
  const after = replaceSectionContent(before, sectionName, replacement);
  const changed = before !== after;

  if (changed) {
    await writeFile(readmePath, after, "utf8");
  }

  return { before, after, changed };
}
