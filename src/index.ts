import * as core from "@actions/core";
import { fetchBadges } from "./credly.js";
import { commitAndPush, hasDiff } from "./git.js";
import { updateReadmeFile } from "./readme.js";
import { renderBadges, type SortOrder } from "./render.js";

function parsePositiveInteger(input: string, fieldName: string): number {
  const parsed = Number.parseInt(input, 10);

  if (Number.isNaN(parsed) || parsed < 0) {
    throw new Error(`${fieldName} must be a non-negative integer.`);
  }

  return parsed;
}

function parseSort(input: string): SortOrder {
  const value = input.toUpperCase();

  if (value === "LATEST" || value === "OLDEST" || value === "NAME") {
    return value;
  }

  throw new Error(`sort must be one of LATEST, OLDEST, or NAME. Received "${input}".`);
}

async function run(): Promise<void> {
  const credlyUser = core.getInput("credly_user", { required: true });
  const readmePath = core.getInput("readme_path") || "README.md";
  const sectionName = core.getInput("section_name") || "badges";
  const commitMessage = core.getInput("commit_message") || "chore: update credly badges";
  const emptyMessage = core.getInput("empty_message") || "No badges found.";
  const sort = parseSort(core.getInput("sort") || "LATEST");
  const maxBadges = parsePositiveInteger(core.getInput("max_badges") || "0", "max_badges");
  const badgeWidth = parsePositiveInteger(core.getInput("badge_width") || "100", "badge_width");
  const dryRun = core.getBooleanInput("dry_run");

  const badges = await fetchBadges(credlyUser);
  const rendered = renderBadges(badges, {
    badgeWidth,
    emptyMessage,
    maxBadges,
    sort,
  });

  if (dryRun) {
    core.info(rendered);
    return;
  }

  const result = await updateReadmeFile(readmePath, sectionName, rendered);
  if (!result.changed) {
    core.info("README content is already up to date.");
    return;
  }

  if (!hasDiff(readmePath)) {
    core.info("README file changed in memory, but git reported no diff.");
    return;
  }

  commitAndPush(readmePath, commitMessage);
  core.info("README updated and pushed successfully.");
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  core.setFailed(message);
});
