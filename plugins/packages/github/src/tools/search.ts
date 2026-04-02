// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import type { ToolResult } from "../../../quickjs.d";
import { githubGet } from "../api";
import { required, optional } from "../params";
import { pluralize, statusBlock, successResult, tableBlock } from "../result";
import type { GitHubCodeResult, GitHubSearchResult } from "../types";

export async function searchCode(
  token: string,
  input: Record<string, unknown>,
): Promise<ToolResult> {
  const query = required(input, "query");
  const page = optional(input, "page", 1);
  const perPage = optional(input, "per_page", 30);
  const resp = await githubGet(
    token,
    `/search/code?q=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`,
  );
  const data: GitHubSearchResult<GitHubCodeResult> = resp.json();
  const items = data.items || [];
  if (!items.length) {
    return successResult(
      "No code matches found.",
      "0 code matches",
      [statusBlock(`No code matches found for "${query}".`)],
    );
  }

  const rows = items.map((item, index) => [
    String(index + 1),
    item.repository?.full_name || "-",
    item.path,
    item.name,
  ]);

  const message = [
    `Code search results for "${query}" (${data.total_count} total):`,
    "",
    ...items.flatMap((item, index) => [
      `${index + 1}. ${item.repository?.full_name || "unknown"}/${item.path}`,
      `   Name: ${item.name}`,
      `   URL: ${item.html_url}`,
      "",
    ]),
  ].join("\n").trim();

  return successResult(
    message,
    `${items.length} code ${pluralize(items.length, "match")} found`,
    [
      statusBlock(`Found ${items.length} code ${pluralize(items.length, "match")} for "${query}".`),
      tableBlock(["#", "Repository", "Path", "Name"], rows),
    ],
  );
}
