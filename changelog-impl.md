# Changelog Implementation Guide

This document describes how changelog functionality is implemented in this project: tools, configuration, workflows, and optional per-feature tracking.

---

## Table of Contents

1. [Overview](#overview)
2. [Conventions & Commit Format](#conventions--commit-format)
3. [Tools & Dependencies](#tools--dependencies)
4. [Configuration](#configuration)
5. [Main Changelog (CHANGELOG.md)](#main-changelog-changelogmd)
6. [Release Workflow](#release-workflow)
7. [PR Changelog Preview](#pr-changelog-preview)
8. [Per-Feature Changelogs (Optional)](#per-feature-changelogs-optional)
9. [Local Usage](#local-usage)
10. [References](#references)

---

## Overview

The project uses a **conventional-commits + standard-version** approach:

- **Single source of truth:** Git history. Commits follow [Conventional Commits](https://www.conventionalcommits.org/).
- **CHANGELOG.md** is **auto-generated** on release; it is not edited by hand.
- **Semantic version** (major/minor/patch) is derived from commit types (e.g. `feat` → minor, `fix` → patch, `BREAKING CHANGE` → major).
- **Commit messages are enforced** via Husky + Commitlint so invalid messages are rejected before commit.
- **Optional:** Per-feature changelogs under `.changelogs/features/` for large, multi-PR features.

---

## Conventions & Commit Format

### Commit format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

- **type:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, or `BREAKING CHANGE`.
- **scope:** Required in this project (enforced by commitlint). Use module or area, e.g. `positions`, `notifications`, `config`.
- **subject:** Short description; no sentence case required (subject-case rule is disabled for upper-case).

### Enforcement

- **Commitlint** (via `@commitlint/config-conventional` and project overrides) runs on **commit-msg** (Husky).
- **Rules** (see `commitlint.config.js`):
  - Scope is required (`scope-empty: [2, 'never']`).
  - Header max length 100 characters.
  - Subject is not forced to a specific case.

Invalid commit messages are rejected at `git commit` time.

---

## Tools & Dependencies

| Purpose             | Tool                                                                                                                                                                                | Version / Config               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Changelog & version | [standard-version](https://github.com/conventional-changelog/standard-version)                                                                                                      | `^9.5.0`                       |
| Commit validation   | [@commitlint/cli](https://commitlint.js.org/) + [@commitlint/config-conventional](https://github.com/conventional-changelog/commitlint/tree/master/@commitlint/config-conventional) | `^18.0.0`                      |
| Git hooks           | [husky](https://typicode.github.io/husky/)                                                                                                                                          | `^9.0.0`                       |
| Interactive commits | [commitizen](https://github.com/commitizen/cz-cli) + [cz-conventional-changelog](https://github.com/commitizen/cz-conventional-changelog)                                           | Optional, for `npm run commit` |

standard-version uses **conventional-changelog** under the hood to parse commits and write `CHANGELOG.md`.

---

## Configuration

### `.versionrc.js` (standard-version)

Defines how commit types map to changelog sections and how URLs are built:

- **types:** Each type maps to a section (e.g. `feat` → "✨ Features", `fix` → "🐛 Bug Fixes"). `chore` and `style` are hidden (not shown in changelog).
- **URLs:** Commit, compare, and issue URLs point at the GitHub repo (owner/repository placeholders).

Relevant snippet:

```javascript
types: [
  { type: 'feat', section: '✨ Features' },
  { type: 'fix', section: '🐛 Bug Fixes' },
  { type: 'perf', section: '⚡ Performance' },
  { type: 'refactor', section: '♻️ Refactoring' },
  { type: 'test', section: '✅ Tests', hidden: false },
  { type: 'docs', section: '📚 Documentation', hidden: false },
  { type: 'chore', hidden: true },
  { type: 'style', hidden: true },
],
commitUrlFormat: 'https://github.com/{{owner}}/{{repository}}/commit/{{hash}}',
compareUrlFormat: 'https://github.com/{{owner}}/{{repository}}/compare/{{previousTag}}...{{currentTag}}',
issueUrlFormat: 'https://github.com/{{owner}}/{{repository}}/issues/{{id}}',
```

### `commitlint.config.js`

- Extends `@commitlint/config-conventional`.
- Adds: scope required, header max length 100, subject-case rule set so upper-case is allowed.

### Git hook

- **`.husky/commit-msg`** runs `npx commitlint --edit "$1"` so every commit message is validated.

---

## Main Changelog (CHANGELOG.md)

- **Location:** Root `CHANGELOG.md`.
- **Generated by:** `standard-version` during release (or `npm run release:dry` for preview).
- **Content:** Sections per version (e.g. `### [0.0.4](...)`) with subsections by type (✨ Features, 🐛 Bug Fixes, etc.) and bullet points with commit subject + link.
- **Do not edit manually.** Edits would be overwritten on the next release. All content comes from commits since the last tag.

---

## Release Workflow

**File:** `.github/workflows/changelog.yml`

**Triggers:**

- Push to `main`
- Manual `workflow_dispatch` with input `release_type`: `auto` (default), `patch`, `minor`, `major`

**Steps (summary):**

1. Checkout with full history (`fetch-depth: 0`).
2. Setup Node 20, `npm ci`.
3. Configure git user for commits.
4. **Generate changelog and bump version:**
   - If `release_type` is `auto` or empty: `npm run release` (standard-version infers bump from commits).
   - Otherwise: `npm run release -- --release-as <patch|minor|major>`.
5. Push commits and tags: `git push --follow-tags origin main`.
6. **Create GitHub Release:** `gh release create "v${VERSION}"` with `--notes-file CHANGELOG.md` and `--latest`.

So: on every release, **CHANGELOG.md** and **package.json** version are updated by standard-version, then committed and pushed with the new tag; the same tag is used for the GitHub Release whose notes come from **CHANGELOG.md**.

---

## PR Changelog Preview

**File:** `.github/workflows/pr-changelog-preview.yml`

**Trigger:** Pull request opened or updated (e.g. new commits).

**Steps:**

1. Checkout with full history, setup Node, `npm ci`.
2. Run **dry-run** release: `npm run release:dry` (standard-version without writing files or creating tag). Output is captured to `changelog-preview.txt` (truncated to 4000 chars in script).
3. **Comment on the PR** with a markdown block showing that preview and a note that it’s what will be added to CHANGELOG.md on merge to main.

This gives reviewers a preview of the next changelog entry based on the PR branch’s commits.

---

## Per-Feature Changelogs (Optional)

For large features that span multiple PRs, the project supports **feature-specific changelogs** that are separate from the main CHANGELOG.md.

### Layout

- **`.changelogs/features/`** – one file per feature, e.g. `morpho-integration.md`.
- **`.changelogs/features/_template.md`** – template with sections: Status, Target Release, Overview, Changes (Backend/API/Testing), Breaking Changes, Migration Guide, Related Issues, **Commits**.
- **`.changelogs/features/README.md`** – short instructions and pointer to the update script.
- **`.changelogs/releases/README.md`** – notes that the main changelog is in `CHANGELOG.md` (standard-version); this folder is for optional per-release notes.

### Update script: `scripts/update-feature-changelog.ts`

- **Usage:** `npx ts-node scripts/update-feature-changelog.ts <feature-name>`
- **Example:** `npx ts-node scripts/update-feature-changelog.ts morpho-integration`
- **Requirement:** `.changelogs/features/<feature-name>.md` must exist.
- **Behavior:**
  - Derives a scope from the feature name (e.g. `morpho-integration` → `morphointegration`) and searches git history for commits whose message contains that scope in parentheses, e.g. `(morphointegration)`.
  - Replaces the **## Commits** section in the feature file with a bullet list of matching commits (or a placeholder if none).
  - Writes the result back to the same file.

So: **main CHANGELOG** = standard-version from all conventional commits; **feature changelogs** = manually maintained files whose **Commits** section can be refreshed by this script based on scoped commits.

---

## Local Usage

| Task                                                                 | Command                                                          |
| -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Preview next changelog + version bump (no file changes, no tag)      | `npm run release:dry`                                            |
| Do a release (bump version, update CHANGELOG.md, create tag, commit) | `npm run release`                                                |
| Force patch/minor/major                                              | `npm run release:patch` / `release:minor` / `release:major`      |
| Write commits in conventional format interactively                   | `npm run commit` (Commitizen)                                    |
| Update a feature changelog’s “Commits” section                       | `npx ts-node scripts/update-feature-changelog.ts <feature-name>` |

After a local release you still need to push commits and tags (e.g. `git push --follow-tags origin main`). The CI workflow can also perform the release on push to `main` or via manual dispatch.

---

## References

- [Conventional Commits](https://www.conventionalcommits.org/)
- [standard-version](https://github.com/conventional-changelog/standard-version)
- [Keep a Changelog](https://keepachangelog.com/)
- [Semantic Versioning](https://semver.org/)
- Project: **GITHUB_INTEGRATION_GUIDE.md** – broader GitHub & changelog strategy and examples.
- Project: **AGENTS.md** – Git commit convention and workflow (e.g. conventional commit format and scopes).
