#!/usr/bin/env node
/**
 * Generate a single-file markdown doc from Ponder Vocs docs (e.g. 0.15).
 * Usage: node generate-ponder-docs.js [--repo <path>] [--version 0.15] [--output ponder-docs-0.15.md]
 * If --repo is omitted, fetches from GitHub raw (requires network).
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/ponder-sh/ponder/main/docs/pages/docs";

// Sidebar order for 0.15 (relative paths under docs/pages/docs/0.15/)
const ORDER_0_15 = [
  "get-started.mdx",
  "requirements.mdx",
  "database.mdx",
  "migration-guide.mdx",
  "config/chains.mdx",
  "config/contracts.mdx",
  "config/accounts.mdx",
  "config/block-intervals.mdx",
  "schema/tables.mdx",
  "schema/relations.mdx",
  "schema/views.mdx",
  "indexing/overview.mdx",
  "indexing/write.mdx",
  "indexing/read-contracts.mdx",
  "query/sql-over-http.mdx",
  "query/graphql.mdx",
  "query/api-endpoints.mdx",
  "query/direct-sql.mdx",
  "production/marble.mdx",
  "production/railway.mdx",
  "production/self-hosting.mdx",
  "guides/factory.mdx",
  "guides/isolated-indexing.mdx",
  "guides/call-traces.mdx",
  "guides/receipts.mdx",
  "guides/time-series.mdx",
  "guides/offchain-data.mdx",
  "guides/foundry.mdx",
  "api-reference/create-ponder.mdx",
  "api-reference/ponder/cli.mdx",
  "api-reference/ponder/config.mdx",
  "api-reference/ponder/schema.mdx",
  "api-reference/ponder/indexing-functions.mdx",
  "api-reference/ponder/api-endpoints.mdx",
  "api-reference/ponder/database.mdx",
  "api-reference/ponder-client.mdx",
  "api-reference/ponder-react.mdx",
  "api-reference/ponder-utils.mdx",
  "advanced/observability.mdx",
  "advanced/telemetry.mdx",
];

function parseArgs() {
  const args = process.argv.slice(2);
  let repo = null;
  let version = "0.15";
  let output = "ponder-docs-0.15.md";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--repo" && args[i + 1]) {
      repo = args[++i];
    } else if (args[i] === "--version" && args[i + 1]) {
      version = args[++i];
    } else if (args[i] === "--output" && args[i + 1]) {
      output = args[++i];
    }
  }
  return { repo, version, output };
}

function getOrder(version) {
  if (version === "0.15") return ORDER_0_15;
  return ORDER_0_15;
}

function stripFrontmatter(content) {
  const start = content.startsWith("---") ? content.indexOf("---", 3) + 3 : 0;
  const from = start > 0 ? content.indexOf("\n", start) + 1 : 0;
  return content.slice(from).replace(/^\n+/, "");
}

function simplifyVocs(content) {
  let out = content;
  // Remove :::code-group, keep first code block content (simplified: remove wrapper, keep ``` blocks)
  out = out.replace(/:::code-group\s*\n/g, "");
  out = out.replace(/```\s*\[[^\]]*\]\s*\n/g, "```\n");
  out = out.replace(/::::steps\s*\n/g, "");
  out = out.replace(/::::\s*\n/g, "");
  out = out.replace(/:::tip\s*\n/g, "Note: ");
  out = out.replace(/:::info\s*\n/g, "Note: ");
  out = out.replace(/:::warning\s*\n/g, "Warning: ");
  out = out.replace(/:::\s*\n/g, "");
  return out;
}

function pathToAnchor(linkPath) {
  const p = linkPath
    .replace(/^\//, "")
    .replace(/\.mdx$/, "")
    .replace(/\//g, "-");
  return "#" + p;
}

function convertLinks(content, version) {
  let out = content;
  const versionPrefix = `/docs/${version}/`;
  out = out.replace(
    new RegExp(
      `\\(${versionPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^)]+)\\)`,
      "g"
    ),
    (_, p) => "(" + pathToAnchor("/" + p) + ")"
  );
  // Same-site links without version (e.g. /docs/query/direct-sql)
  out = out.replace(
    /\((\/docs\/)([^)]+)\)/g,
    (_, slash, p) => "(" + pathToAnchor(p) + ")"
  );
  return out;
}

function pathToSectionTitle(relPath) {
  const base = relPath.replace(/\.mdx$/, "");
  const parts = base
    .split("/")
    .map((p) => p.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
  return parts.join(" > ");
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          return fetchUrl(res.headers.location).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${url}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

async function readLocal(repo, version, relPath) {
  const fullPath = path.join(repo, "docs", "pages", "docs", version, relPath);
  return fs.promises.readFile(fullPath, "utf8");
}

async function readRemote(version, relPath) {
  const url = `${GITHUB_RAW_BASE}/${version}/${relPath}`;
  return fetchUrl(url);
}

async function main() {
  const { repo, version, output } = parseArgs();
  const order = getOrder(version);

  const header = `# Ponder Documentation (v${version})

Source: https://ponder.sh/ | https://github.com/ponder-sh/ponder/tree/main/docs
Generated: ${new Date().toISOString().slice(0, 10)}

---

`;

  const sections = [header];

  for (const relPath of order) {
    let content;
    try {
      content = repo
        ? await readLocal(repo, version, relPath)
        : await readRemote(version, relPath);
    } catch (err) {
      console.error(`Failed to read ${relPath}:`, err.message);
      sections.push(
        `## ${pathToSectionTitle(relPath)}\n\n[Error: could not load this section.]\n\n`
      );
      continue;
    }
    content = stripFrontmatter(content);
    content = simplifyVocs(content);
    content = convertLinks(content, version);
    const title = pathToSectionTitle(relPath);
    sections.push(`## ${title}\n\n${content.trim()}\n\n`);
  }

  const outPath = path.isAbsolute(output)
    ? output
    : path.join(process.cwd(), output);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, sections.join(""), "utf8");
  console.log(`Wrote ${sections.length - 1} sections to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
