// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { githubGet } from "../api";
import { required, optional } from "../params";
import type { GitHubBranch } from "../types";

export async function listBranches(
  token: string,
  input: Record<string, unknown>,
): Promise<string> {
  const owner = required(input, "owner");
  const repo = required(input, "repo");
  const perPage = optional(input, "per_page", 30);
  const resp = await githubGet(
    token,
    `/repos/${owner}/${repo}/branches?per_page=${perPage}`,
  );
  const branches: GitHubBranch[] = resp.json();
  if (!branches.length) return "No branches found.";
  return branches
    .map((b) => {
      const sha = (b.commit?.sha || "").substring(0, 7);
      return `${b.name} (${sha})`;
    })
    .join("\n");
}
