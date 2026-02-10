---
name: vocs-ponder-docs
description: Generates a single-file markdown documentation from Vocs-based doc sites (e.g. Ponder). Use when the user needs LLM context from ponder.sh docs, wants only a specific version (e.g. 0.15), or asks to extract/merge docs from GitHub.
---

# Vocs Ponder Docs

Generates one markdown file containing a chosen version of Ponder docs (e.g. 0.15) for use as LLM context. Source is the [ponder-sh/ponder](https://github.com/ponder-sh/ponder) docs (Vocs site at [ponder.sh](https://ponder.sh)).

## When to Use This Skill

- Building LLM context from Ponder documentation
- Extracting one version from multi-version Vocs docs (e.g. 0.15 only)
- Reproducing or regenerating the Ponder 0.15 single-file doc
- User asks to "extract Ponder docs" or "create docs from ponder.sh"

## Workflow

1. **Identify doc root**: For Ponder 0.15 use `docs/pages/docs/0.15` under the ponder-sh/ponder repo.
2. **Resolve file list and order**: Use the version’s sidebar. Source of truth is `"/docs/0.15/"` in [docs/sidebar.ts](https://github.com/ponder-sh/ponder/blob/main/docs/sidebar.ts). Flatten nested `items` into a single ordered list of `link` paths; map each link to a file under `docs/pages/docs/0.15/` (e.g. `/docs/0.15/get-started` → `get-started.mdx`). See [reference.md](reference.md) for the exact 0.15 order and path mapping.
3. **For each `.mdx` in that order**: Fetch or read content, strip frontmatter and Vocs-only directives (see MDX cleanup below), then append to the output with a clear section header (e.g. `## Get started`, `## Config > Chains`).
4. **Normalize internal links**: Convert `/docs/0.15/...` to in-doc anchors (e.g. `#get-started`, `#config-chains`) so the single file is self-contained. Be consistent throughout.
5. **Write one file**: Output to e.g. `ponder-docs-0.15.md`. Add a short header: title, source URL, version, and optional generation date.

## MDX / Vocs Cleanup (LLM-friendly output)

- **Remove YAML frontmatter**: Strip `---` blocks at the top of each file.
- **Vocs directives**: Simplify or remove:
  - `:::code-group` / `::::steps`: Keep the text and first (or relevant) code block; drop the wrapper and tabs.
  - `:::tip`, `:::info`, `:::warning`: Keep the inner text as a short "Note: …" or "Warning: …" line.
  - Strip component names and empty directive lines that don’t add context.
- **Keep**: Code blocks, headings, lists, and body text.

## Using the Script

Run the bundled script for repeatable generation:

```bash
node .cursor/skills/vocs-ponder-docs/scripts/generate-ponder-docs.js [options]
```

**Options** (optional):

- `--repo <path>`: Local path to ponder-sh/ponder repo. If omitted, script uses GitHub raw URLs (requires network).
- `--version <ver>`: Doc version (default `0.15`).
- `--output <path>`: Output file path (default `ponder-docs-0.15.md`).

The script clones or uses an existing repo, reads MDX from `docs/pages/docs/<version>/` in sidebar order, applies stripping, and writes one markdown file. The agent may run this script or follow the same steps manually (e.g. via GitHub MCP + file writes).

## Manual Generation (no script)

If not using the script:

1. Use GitHub MCP `get_file_contents` for `ponder-sh/ponder` and path `docs/pages/docs/0.15/...` for each file in [reference.md](reference.md) order.
2. For each file: strip frontmatter and Vocs directives, add a `## …` section title, convert links to anchors.
3. Concatenate all sections and write to a single `.md` file in the workspace.

## Additional Resources

- **Order and paths**: [reference.md](reference.md) — ordered list of 0.15 MDX paths and link→file mapping.
- **Ponder docs**: https://ponder.sh/ (Vocs). Repo: https://github.com/ponder-sh/ponder/tree/main/docs.
