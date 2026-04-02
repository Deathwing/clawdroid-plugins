// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import type { ToolResult } from "../../../quickjs.d";
import { githubGet } from "../api";
import { required, optional } from "../params";
import { pluralize, statusBlock, successResult, tableBlock } from "../result";
import type { GitHubBranch } from "../types";

export async function listBranches(
  token: string,
  input: Record<string, unknown>,
): Promise<ToolResult> {
  const owner = required(input, "owner");
  const repo = required(input, "repo");
  const perPage = optional(input, "per_page", 30);
  const resp = await githubGet(
    token,
    `/repos/${owner}/${repo}/branches?per_page=${perPage}`,
  );
  const branches: GitHubBranch[] = resp.json();
  if (!branches.length) {
    return successResult(
      "No branches found.",
      "0 branches found",
      [statusBlock(`No branches found for ${owner}/${repo}.`)],
    );
  }

  const rows = branches.map((branch, index) => [
    String(index + 1),
    branch.name,
    (branch.commit?.sha || "").substring(0, 7) || "-",
  ]);

  const message = branches
    .map((branch) => `${branch.name} (${(branch.commit?.sha || "").substring(0, 7)})`)
    .join("\n");

  return successResult(
    message,
    `${branches.length} ${pluralize(branches.length, "branch")} found`,
    [
      statusBlock(`Found ${branches.length} ${pluralize(branches.length, "branch")} for ${owner}/${repo}.`),
      tableBlock(["#", "Branch", "Commit"], rows),
    ],
  );
}
