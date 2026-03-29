// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { githubGet } from "../api";
import { required, optional } from "../params";
import type { GitHubPullRequest } from "../types";

export async function listPullRequests(
  token: string,
  input: Record<string, unknown>,
): Promise<string> {
  const owner = required(input, "owner");
  const repo = required(input, "repo");
  const state = optional(input, "state", "open");
  const perPage = optional(input, "per_page", 20);
  const resp = await githubGet(
    token,
    `/repos/${owner}/${repo}/pulls?state=${state}&per_page=${perPage}`,
  );
  const prs: GitHubPullRequest[] = resp.json();
  if (!prs.length) return "No pull requests found.";
  return prs
    .map((p) => {
      const user = p.user?.login || "";
      const head = p.head?.ref || "";
      const base = p.base?.ref || "";
      return `#${p.number} ${p.title} (${head} → ${base}) by ${user}`;
    })
    .join("\n");
}

export async function getPullRequest(
  token: string,
  input: Record<string, unknown>,
): Promise<string> {
  const owner = required(input, "owner");
  const repo = required(input, "repo");
  const number = required(input, "number");
  const resp = await githubGet(token, `/repos/${owner}/${repo}/pulls/${number}`);
  const p: GitHubPullRequest = resp.json();
  return [
    `#${p.number}: ${p.title}`,
    `State: ${p.state}`,
    `Author: ${p.user?.login || "unknown"}`,
    `Branch: ${p.head?.ref || "?"} → ${p.base?.ref || "?"}`,
    `Mergeable: ${p.mergeable !== null ? p.mergeable : "unknown"}`,
    `Additions: +${p.additions ?? "?"} Deletions: -${p.deletions ?? "?"}`,
    `Changed files: ${p.changed_files ?? "?"}`,
    `Created: ${p.created_at}`,
    "",
    p.body || "(no description)",
  ].join("\n");
}
