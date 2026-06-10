"use strict";

const fs = require("node:fs/promises");
const { spawnSync } = require("node:child_process");

function getInput(name, options = {}) {
  const key = `INPUT_${name.replace(/ /g, "_").toUpperCase()}`;
  const value = process.env[key] || "";
  if (options.required && value.trim() === "") {
    throw new Error(`Input required and not supplied: ${name}`);
  }
  return value.trim();
}

function getBooleanInput(name) {
  const value = getInput(name).toLowerCase();
  if (value === "true") {
    return true;
  }
  if (value === "false" || value === "") {
    return false;
  }
  throw new Error(`Input "${name}" must be true or false.`);
}

function info(message) {
  process.stdout.write(`${message}\n`);
}

function setFailed(message) {
  process.stdout.write(`::error::${message}\n`);
  process.exitCode = 1;
}

function isObject(value) {
  return typeof value === "object" && value !== null;
}

function extractString(value) {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeBadge(rawBadge) {
  if (!isObject(rawBadge)) {
    return null;
  }

  const id = extractString(rawBadge.id);
  const issuedAtDate = extractString(rawBadge.issued_at_date) || "";
  const badgeTemplate = isObject(rawBadge.badge_template) ? rawBadge.badge_template : {};
  const name = extractString(badgeTemplate.name);
  const templateImageUrl = extractString(badgeTemplate.image_url);
  const fallbackImageUrl = extractString(rawBadge.image_url);
  const imageUrl = templateImageUrl || fallbackImageUrl;

  if (!id || !name || !imageUrl) {
    return null;
  }

  return { id, issuedAtDate, imageUrl, name };
}

async function fetchBadges(credlyUser, options = {}) {
  const timeoutMs = options.timeoutMs || 10000;
  const retries = options.retries || 2;
  const url = `https://www.credly.com/users/${encodeURIComponent(credlyUser)}/badges.json`;
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { accept: "application/json" }
      });

      if (!response.ok) {
        throw new Error(`Credly request failed with status ${response.status}.`);
      }

      const payload = await response.json();
      if (!Array.isArray(payload.data)) {
        throw new Error("Credly response did not include a valid data array.");
      }

      clearTimeout(timeoutId);
      return payload.data.map(normalizeBadge).filter(Boolean);
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;
      if (attempt === retries) {
        break;
      }
      await delay(500 * 2 ** attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Failed to fetch badges.");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function sortBadges(badges, sort) {
  const copied = [...badges];

  if (sort === "LATEST") {
    return copied.sort((left, right) => Date.parse(right.issuedAtDate || "1970-01-01") - Date.parse(left.issuedAtDate || "1970-01-01"));
  }

  if (sort === "OLDEST") {
    return copied.sort((left, right) => Date.parse(left.issuedAtDate || "1970-01-01") - Date.parse(right.issuedAtDate || "1970-01-01"));
  }

  if (sort === "NAME") {
    return copied.sort((left, right) => left.name.localeCompare(right.name, "en"));
  }

  return copied;
}

function renderBadges(badges, options) {
  const sorted = sortBadges(badges, options.sort);
  const limited = options.maxBadges > 0 ? sorted.slice(0, options.maxBadges) : sorted;

  if (limited.length === 0) {
    return options.emptyMessage;
  }

  return limited.map((badge) => {
    const escapedName = escapeHtml(badge.name);
    return `<a href="https://www.credly.com/badges/${badge.id}" title="${escapedName}"><img src="${badge.imageUrl}" width="${options.badgeWidth}" alt="${escapedName}" /></a>`;
  }).join(" ");
}

function replaceSectionContent(content, sectionName, replacement) {
  const start = `<!--START_SECTION:${sectionName}-->`;
  const end = `<!--END_SECTION:${sectionName}-->`;
  const escapedStart = start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedEnd = end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(${escapedStart}\\s*)([\\s\\S]*?)(\\s*${escapedEnd})`, "m");

  if (!pattern.test(content)) {
    throw new Error(`Markers for section "${sectionName}" were not found in README.`);
  }

  return content.replace(pattern, `$1${replacement}$3`);
}

async function updateReadmeFile(readmePath, sectionName, replacement) {
  const before = await fs.readFile(readmePath, "utf8");
  const after = replaceSectionContent(before, sectionName, replacement);
  const changed = before !== after;

  if (changed) {
    await fs.writeFile(readmePath, after, "utf8");
  }

  return { changed };
}

function runGit(args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(" ")} failed.`);
  }
}

function hasDiff(readmePath) {
  const result = spawnSync("git", ["diff", "--quiet", "--", readmePath], { encoding: "utf8" });
  if (result.status === 0) {
    return false;
  }
  if (result.status === 1) {
    return true;
  }
  throw new Error(result.stderr.trim() || "Unable to determine git diff status.");
}

function parsePositiveInteger(input, fieldName) {
  const parsed = Number.parseInt(input, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new Error(`${fieldName} must be a non-negative integer.`);
  }
  return parsed;
}

function parseSort(input) {
  const value = input.toUpperCase();
  if (value === "LATEST" || value === "OLDEST" || value === "NAME") {
    return value;
  }
  throw new Error(`sort must be one of LATEST, OLDEST, or NAME. Received "${input}".`);
}

async function main() {
  const credlyUser = getInput("credly_user", { required: true });
  const readmePath = getInput("readme_path") || "README.md";
  const sectionName = getInput("section_name") || "badges";
  const commitMessage = getInput("commit_message") || "chore: update credly badges";
  const emptyMessage = getInput("empty_message") || "No badges found.";
  const sort = parseSort(getInput("sort") || "LATEST");
  const maxBadges = parsePositiveInteger(getInput("max_badges") || "0", "max_badges");
  const badgeWidth = parsePositiveInteger(getInput("badge_width") || "100", "badge_width");
  const dryRun = getBooleanInput("dry_run");

  const badges = await fetchBadges(credlyUser);
  const rendered = renderBadges(badges, {
    badgeWidth,
    emptyMessage,
    maxBadges,
    sort
  });

  if (dryRun) {
    info(rendered);
    return;
  }

  const result = await updateReadmeFile(readmePath, sectionName, rendered);
  if (!result.changed) {
    info("README content is already up to date.");
    return;
  }

  if (!hasDiff(readmePath)) {
    info("README file changed in memory, but git reported no diff.");
    return;
  }

  runGit(["config", "user.name", "github-actions[bot]"]);
  runGit(["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"]);
  runGit(["add", readmePath]);
  runGit(["commit", "-m", commitMessage]);
  runGit(["push"]);
  info("README updated and pushed successfully.");
}

main().catch((error) => {
  setFailed(error instanceof Error ? error.message : "Unknown error");
});
