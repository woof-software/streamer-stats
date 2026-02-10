#!/usr/bin/env node
/**
 * Updates the ## Commits section in a feature changelog file.
 * Usage: npx ts-node scripts/update-feature-changelog.ts <feature-name>
 * Example: npx ts-node scripts/update-feature-changelog.ts morpho-integration
 *
 * Derives scope from feature name (e.g. morpho-integration → morphointegration)
 * and finds commits whose message contains that scope in parentheses.
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const FEATURES_DIR = path.join(process.cwd(), ".changelogs", "features");
const COMMITS_HEADER = "## Commits";

function deriveScope(featureName: string): string {
  return featureName.replace(/-/g, "");
}

function escapeForGrep(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getMatchingCommits(
  scope: string
): Array<{ hash: string; subject: string }> {
  const pattern = `\\(${escapeForGrep(scope)}\\)`;
  let log: string;
  try {
    log = execSync(`git log --pretty=format:"%h %s" --grep="${pattern}"`, {
      encoding: "utf-8",
      maxBuffer: 1024 * 1024,
    });
  } catch {
    return [];
  }
  const lines = log.trim() ? log.trim().split("\n") : [];
  return lines.map((line) => {
    const space = line.indexOf(" ");
    const hash = space >= 0 ? line.slice(0, space) : line;
    const subject = space >= 0 ? line.slice(space + 1) : "";
    return { hash, subject };
  });
}

function replaceCommitsSection(
  content: string,
  commits: Array<{ hash: string; subject: string }>
): string {
  const headerIndex = content.indexOf(COMMITS_HEADER);
  if (headerIndex === -1) return content;

  const afterHeader = content.slice(headerIndex + COMMITS_HEADER.length);
  const nextSection = afterHeader.match(/\n## /);
  const sectionEnd =
    headerIndex +
    COMMITS_HEADER.length +
    (nextSection ? nextSection.index! : afterHeader.length);
  const rest = content.slice(sectionEnd);

  const bulletList =
    commits.length === 0
      ? "\n\n- _No matching commits yet._\n"
      : "\n\n" +
        commits.map((c) => `- ${c.subject} (\`${c.hash}\`)`).join("\n") +
        "\n";

  return content.slice(0, headerIndex) + COMMITS_HEADER + bulletList + rest;
}

function main(): void {
  const featureName = process.argv[2];
  if (!featureName) {
    console.error(
      "Usage: npx ts-node scripts/update-feature-changelog.ts <feature-name>"
    );
    process.exit(1);
  }

  const filePath = path.join(FEATURES_DIR, `${featureName}.md`);
  if (!fs.existsSync(filePath)) {
    console.error(`Feature changelog not found: ${filePath}`);
    process.exit(1);
  }

  const scope = deriveScope(featureName);
  const commits = getMatchingCommits(scope);
  const content = fs.readFileSync(filePath, "utf-8");
  const newContent = replaceCommitsSection(content, commits);
  fs.writeFileSync(filePath, newContent);
  console.log(
    `Updated ## Commits in ${filePath} (${commits.length} commit(s) with scope "${scope}").`
  );
}

main();
