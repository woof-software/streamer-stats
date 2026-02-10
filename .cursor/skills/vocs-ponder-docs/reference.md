# Ponder 0.15 Doc Order and Path Mapping

Order and file paths for single-file doc generation. Source: `sidebar["/docs/0.15/"]` in [ponder-sh/ponder docs/sidebar.ts](https://github.com/ponder-sh/ponder/blob/main/docs/sidebar.ts).

## Link → file path (sidebar order)

Each row: sidebar `link` (path after `/docs/0.15`) → relative file under `docs/pages/docs/0.15/`.

| #   | Sidebar link                            | File path                                   |
| --- | --------------------------------------- | ------------------------------------------- |
| 1   | get-started                             | get-started.mdx                             |
| 2   | requirements                            | requirements.mdx                            |
| 3   | database                                | database.mdx                                |
| 4   | migration-guide                         | migration-guide.mdx                         |
| 5   | config/chains                           | config/chains.mdx                           |
| 6   | config/contracts                        | config/contracts.mdx                        |
| 7   | config/accounts                         | config/accounts.mdx                         |
| 8   | config/block-intervals                  | config/block-intervals.mdx                  |
| 9   | schema/tables                           | schema/tables.mdx                           |
| 10  | schema/relations                        | schema/relations.mdx                        |
| 11  | schema/views                            | schema/views.mdx                            |
| 12  | indexing/overview                       | indexing/overview.mdx                       |
| 13  | indexing/write                          | indexing/write.mdx                          |
| 14  | indexing/read-contracts                 | indexing/read-contracts.mdx                 |
| 15  | query/sql-over-http                     | query/sql-over-http.mdx                     |
| 16  | query/graphql                           | query/graphql.mdx                           |
| 17  | query/api-endpoints                     | query/api-endpoints.mdx                     |
| 18  | query/direct-sql                        | query/direct-sql.mdx                        |
| 19  | production/marble                       | production/marble.mdx                       |
| 20  | production/railway                      | production/railway.mdx                      |
| 21  | production/self-hosting                 | production/self-hosting.mdx                 |
| 22  | guides/factory                          | guides/factory.mdx                          |
| 23  | guides/isolated-indexing                | guides/isolated-indexing.mdx                |
| 24  | guides/call-traces                      | guides/call-traces.mdx                      |
| 25  | guides/receipts                         | guides/receipts.mdx                         |
| 26  | guides/time-series                      | guides/time-series.mdx                      |
| 27  | guides/offchain-data                    | guides/offchain-data.mdx                    |
| 28  | guides/foundry                          | guides/foundry.mdx                          |
| 29  | api-reference/create-ponder             | api-reference/create-ponder.mdx             |
| 30  | api-reference/ponder/cli                | api-reference/ponder/cli.mdx                |
| 31  | api-reference/ponder/config             | api-reference/ponder/config.mdx             |
| 32  | api-reference/ponder/schema             | api-reference/ponder/schema.mdx             |
| 33  | api-reference/ponder/indexing-functions | api-reference/ponder/indexing-functions.mdx |
| 34  | api-reference/ponder/api-endpoints      | api-reference/ponder/api-endpoints.mdx      |
| 35  | api-reference/ponder/database           | api-reference/ponder/database.mdx           |
| 36  | api-reference/ponder-client             | api-reference/ponder-client.mdx             |
| 37  | api-reference/ponder-react              | api-reference/ponder-react.mdx              |
| 38  | api-reference/ponder-utils              | api-reference/ponder-utils.mdx              |
| 39  | advanced/observability                  | advanced/observability.mdx                  |
| 40  | advanced/telemetry                      | advanced/telemetry.mdx                      |

## Anchor mapping (for in-doc links)

Convert `/docs/0.15/<path>` to `#<anchor>` using the path with slashes replaced by hyphens:

- `/docs/0.15/get-started` → `#get-started`
- `/docs/0.15/config/chains` → `#config-chains`
- `/docs/0.15/api-reference/ponder/cli` → `#api-reference-ponder-cli`

Rule: strip `/docs/0.15/` prefix, then replace `/` with `-`, lowercase. Optionally normalize to match heading slugs (e.g. "Get started" → `#get-started`).
