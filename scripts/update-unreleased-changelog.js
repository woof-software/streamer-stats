#!/usr/bin/env node
/**
 * Appends the last commit to CHANGELOG.md under ## [Unreleased].
 * Skips chore(release) commits. Run from repo root (e.g. via husky post-commit).
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const CHANGELOG_PATH = path.join(__dirname, "..", "CHANGELOG.md");
const PKG_PATH = path.join(__dirname, "..", "package.json");

const TYPE_TO_SECTION = {
  feat: "Features",
  fix: "Bug Fixes",
  perf: "Performance Improvements",
  revert: "Reverts",
  docs: "Documentation",
  style: "Styles",
  chore: "Miscellaneous",
  refactor: "Code Refactoring",
  test: "Tests",
  build: "Build System",
  ci: "CI/CD",
};

function getLastCommit() {
  const hash = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
  const shortHash = execSync("git rev-parse --short HEAD", {
    encoding: "utf-8",
  }).trim();
  const message = execSync("git log -1 --pretty=%B", {
    encoding: "utf-8",
  }).trim();
  return { hash, shortHash, message };
}

function parseConventionalCommit(message) {
  const match = message.match(/^(?:(\w+)(?:\(([^)]+)\))?!?:)\s*(.+)$/);
  if (!match) return null;
  const [, type, scope, subject] = match;
  return { type, scope, subject: subject.trim() };
}

function getCommitUrl() {
  let repo = "owner/repo";
  try {
    const pkg = JSON.parse(fs.readFileSync(PKG_PATH, "utf-8"));
    const r = pkg.repository && (pkg.repository.url || pkg.repository);
    if (r)
      repo = typeof r === "string" ? r.replace(/^github:/, "") : "owner/repo";
  } catch {
    /* ignore parse error */
  }
  const m =
    repo.match(/github\.com[/:](\S+?)(?:\.git)?$/) ||
    (repo.includes("/") ? [null, repo.replace(/\.git$/, "")] : null);
  const slug = m ? m[1] : repo;
  return (hash) => `https://github.com/${slug}/commit/${hash}`;
}

function main() {
  const { hash, shortHash, message } = getLastCommit();
  if (/^chore\(release\):/i.test(message)) return;

  const parsed = parseConventionalCommit(message.split("\n")[0]);
  if (!parsed) return;

  let content = fs.readFileSync(CHANGELOG_PATH, "utf-8");
  const unreleasedHeader = "## [Unreleased]";
  const idx = content.indexOf(unreleasedHeader);
  if (idx === -1) return;

  const afterUnreleased = content.slice(idx + unreleasedHeader.length);
  const nextRelease = afterUnreleased.match(/\n## /);
  const unreleasedBlock = nextRelease
    ? afterUnreleased.slice(0, nextRelease.index)
    : afterUnreleased;
  if (unreleasedBlock.includes(parsed.subject)) return;

  const section = TYPE_TO_SECTION[parsed.type] || "Miscellaneous";
  const commitUrl = getCommitUrl()(hash);
  const line = `- ${parsed.scope ? `**${parsed.scope}:** ` : ""}${parsed.subject} ([${shortHash}](${commitUrl}))`;

  const sectionHeader = `### ${section}`;
  let newContent;

  if (afterUnreleased.includes(sectionHeader)) {
    const sectionStart = afterUnreleased.indexOf(sectionHeader);
    const nextSection = afterUnreleased
      .slice(sectionStart + sectionHeader.length)
      .match(/\n### /);
    const endOfSection = nextSection
      ? sectionStart + sectionHeader.length + nextSection.index
      : afterUnreleased.length;
    const sectionContent = afterUnreleased.slice(sectionStart, endOfSection);
    const insertPoint =
      idx + unreleasedHeader.length + sectionStart + sectionContent.length;
    newContent =
      content.slice(0, insertPoint) + "\n" + line + content.slice(insertPoint);
  } else {
    const insertPoint = idx + unreleasedHeader.length;
    const block =
      (afterUnreleased.startsWith("\n\n") ? "" : "\n\n") +
      sectionHeader +
      "\n\n" +
      line +
      "\n";
    newContent =
      content.slice(0, insertPoint) + block + content.slice(insertPoint);
  }

  fs.writeFileSync(CHANGELOG_PATH, newContent);
}

main();
