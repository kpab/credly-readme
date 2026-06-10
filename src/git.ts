import { spawnSync } from "node:child_process";

function runGit(args: string[]): void {
  const result = spawnSync("git", args, {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(" ")} failed.`);
  }
}

export function hasDiff(readmePath: string): boolean {
  const result = spawnSync("git", ["diff", "--quiet", "--", readmePath], {
    encoding: "utf8",
  });

  if (result.status === 0) {
    return false;
  }

  if (result.status === 1) {
    return true;
  }

  throw new Error(result.stderr.trim() || "Unable to determine git diff status.");
}

export function commitAndPush(readmePath: string, commitMessage: string): void {
  runGit(["config", "user.name", "github-actions[bot]"]);
  runGit(["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"]);
  runGit(["add", readmePath]);
  runGit(["commit", "-m", commitMessage]);
  runGit(["push"]);
}
