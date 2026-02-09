# cursor-foundation

## Cursor / AI context (Morpho docs)

For best AI assistance on Morpho-related code, add the Morpho docs to Cursor so they are indexed:

1. Open **Cursor Settings** (⌘,) → **Features** → **Docs**.
2. Click **Add new doc** and add: `https://docs.morpho.org/llms-all.txt`.

This is per-machine; each teammate should do it once. The project also has a [Cursor rule](.cursor/rules/morpho-docs.mdc) that references this URL so the AI knows to use it when relevant.

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

Releases and `CHANGELOG.md` are driven by [Conventional Commits](https://www.conventionalcommits.org/) and [Keep a Changelog](https://keepachangelog.com/). Two flows are available:

- **semantic-release (push to main)**: When you push to `main`, the Husky `pre-push` hook runs [semantic-release](https://semantic-release.gitbook.io/) locally. It analyzes commits, bumps the version, updates `CHANGELOG.md`, creates a tag and GitHub Release, and pushes the release commit. No `NPM_TOKEN` in CI is required.
- **standard-version (manual or CI)**: For explicit patch/minor/major bumps, use the npm scripts below or the GitHub Actions **Release** workflow.

### Local release (standard-version)

From the default branch (e.g. `main`), run:

- `npm run release` – bump version based on commits (interactive)
- `npm run release:patch` – patch release (1.0.0 → 1.0.1)
- `npm run release:minor` – minor release (1.0.0 → 1.1.0)
- `npm run release:major` – major release (1.0.0 → 2.0.0)
- `npm run release:dry` – preview changes without writing or tagging

Then push the release commit and tag: `git push --follow-tags origin main`.

### Release from GitHub Actions

1. Open **Actions** → **Release** → **Run workflow**.
2. Choose **Release type** (patch, minor, or major) and run.
3. The workflow bumps the version, updates `CHANGELOG.md`, pushes the commit and tag, and creates a GitHub Release with generated notes.

Set `repository` in `package.json` to your `owner/repo` (e.g. `"repository": "github:owner/cursor-foundation"`) so changelog compare links are correct. If your default branch is not `main`, update the branch in `.github/workflows/release.yml`.
