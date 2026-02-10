# cursor-foundation

Foundation repo for Woof Software DeFi backend projects: tooling (lint, changelog, releases), workflows, and **AI agent instructions**. No application code lives here—copy what you need into new projects.

- **AI instructions:** [agents/AGENTS.md](agents/AGENTS.md) (architecture, structure, patterns) and [agents/CONVENTIONS.md](agents/CONVENTIONS.md) (code style). Root [AGENTS.md](AGENTS.md) points to them.
- **Using this for a new project:** Copy the `agents/` folder (and optionally `.github/`, `.husky/`, `scripts/`, config files) into the new repo.

## Cursor / AI context (Morpho docs)

For best AI assistance on Morpho-related code, add the Morpho docs to Cursor so they are indexed:

1. Open **Cursor Settings** (⌘,) → **Features** → **Docs**.
2. Click **Add new doc** and add: `https://docs.morpho.org/llms-all.txt`.

This is per-machine; each teammate should do it once. The project also has a [Cursor rule](.cursor/rules/morpho-docs.mdc) that references this URL so the AI knows to use it when relevant.

**Cursor skills:** Agent skills (e.g. changelog automation, git-commit) live in [.cursor/skills/](.cursor/skills/). Cursor reads from that path; it is the canonical location for this repo.

## Lint and format workflow

ESLint and Prettier run automatically:

- **Before every commit**: Staged files are linted and formatted via Husky `pre-commit` (lint-staged). The commit is blocked if checks fail.
- **Before every push**: Full project is checked with `npm run lint` and `npm run format:check` via Husky `pre-push`. The push is blocked if checks fail.
- **Before merge**: GitHub Actions runs the same checks on push and pull requests. Configure branch protection to require the "Lint" check to pass before merging.

### Enabling branch protection (before merge)

1. Open the repo on GitHub → **Settings** → **Branches**.
2. Add or edit a rule for `main` (or your default branch).
3. Enable **Require status checks to pass before merging** and select the **lint** job.
4. Optionally enable **Require branches to be up to date before merging**.

After that, PRs cannot be merged until the Lint workflow passes.

## Releases and changelog

Releases and `CHANGELOG.md` are driven by [Conventional Commits](https://www.conventionalcommits.org/) and [Keep a Changelog](https://keepachangelog.com/). The changelog is **generated locally** (not on the server) using [standard-version](https://github.com/conventional-changelog/standard-version). When you push a version tag, CI creates the GitHub Release using the existing `CHANGELOG.md`.

**Changelog on every commit:** A Husky **post-commit** hook runs `scripts/update-unreleased-changelog.js`, which appends the commit to the `## [Unreleased]` section of `CHANGELOG.md` (conventional commits only; `chore(release):` is skipped). The hook then amends the commit to include the updated `CHANGELOG.md`, so each commit stays self-contained. Run `npm run changelog:unreleased` manually to update Unreleased from the last commit without amending.

### Local release (recommended)

From the default branch (e.g. `main`), run:

- `npm run release` – bump version based on commits (interactive)
- `npm run release:patch` – patch release (1.0.0 → 1.0.1)
- `npm run release:minor` – minor release (1.0.0 → 1.1.0)
- `npm run release:major` – major release (1.0.0 → 2.0.0)
- `npm run release:dry` – preview changes without writing or tagging

standard-version updates `CHANGELOG.md` and `package.json`, commits, and creates a tag. Then push:

```bash
git push --follow-tags origin main
```

Pushing a tag `v*` triggers **Release from tag** (`.github/workflows/release-from-tag.yml`), which creates a GitHub Release with notes taken from `CHANGELOG.md`. No release logic runs on every push to `main`.

### Release from GitHub Actions (optional)

To bump and release from CI instead of locally:

1. Open **Actions** → **Release** → **Run workflow**.
2. Choose **Release type** (patch, minor, or major) and run.
3. The workflow runs standard-version, pushes the commit and tag, and creates the GitHub Release.

Set `repository` in `package.json` to your `owner/repo` (e.g. `"repository": "github:owner/cursor-foundation"`) so changelog compare links are correct. If your default branch is not `main`, update the branch in `.github/workflows/release.yml`.
