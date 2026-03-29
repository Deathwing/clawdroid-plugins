// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { githubGet } from "../api";
import { required, optional } from "../params";
import type { GitHubCodeResult, GitHubSearchResult } from "../types";

export async function searchCode(
  token: string,
  input: Record<string, unknown>,
): Promise<string> {
  const query = required(input, "query");
  const page = optional(input, "page", 1);
  const perPage = optional(input, "per_page", 30);
  const resp = await githubGet(
    token,
    `/search/code?q=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`,
  );
  const data: GitHubSearchResult<GitHubCodeResult> = resp.json();
  return JSON.stringify({
    total_count: data.total_count,
    items: data.items.map((item) => ({
      name: item.name,
      path: item.path,
      repository: item.repository?.full_name,
      html_url: item.html_url,
    })),
  });
}
