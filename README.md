# cursor-foundation

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
