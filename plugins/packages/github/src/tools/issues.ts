// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { githubGet, githubPost } from "../api";
import { required, optional } from "../params";
import type { GitHubIssue } from "../types";

export async function listIssues(token: string, input: Record<string, unknown>): Promise<string> {
  const owner = required(input, "owner");
  const repo = required(input, "repo");
  const state = optional(input, "state", "open");
  const perPage = optional(input, "per_page", 20);
  const resp = await githubGet(
    token,
    `/repos/${owner}/${repo}/issues?state=${state}&per_page=${perPage}`,
  );
  const issues: GitHubIssue[] = resp.json();
  // GitHub returns PRs in the issues endpoint — filter them out
  const filtered = issues.filter((i) => !i.pull_request);
  if (!filtered.length) return "No issues found.";
  return filtered
    .map((i) => {
      const labels = (i.labels || []).map((l) => l.name).join(", ");
      const user = i.user?.login || "";
      return `#${i.number} ${i.title}${labels ? ` [${labels}]` : ""} (by ${user})`;
    })
    .join("\n");
}

export async function getIssue(token: string, input: Record<string, unknown>): Promise<string> {
  const owner = required(input, "owner");
  const repo = required(input, "repo");
  const number = required(input, "number");
  const resp = await githubGet(token, `/repos/${owner}/${repo}/issues/${number}`);
  const i: GitHubIssue = resp.json();
  const lines: string[] = [
    `#${i.number}: ${i.title}`,
    `State: ${i.state}`,
    `Author: ${i.user?.login || "unknown"}`,
  ];
  const labels = (i.labels || []).map((l) => l.name).join(", ");
  if (labels) lines.push(`Labels: ${labels}`);
  lines.push(`Created: ${i.created_at}`);
  lines.push(`Updated: ${i.updated_at}`);
  lines.push("");
  lines.push(i.body || "(no description)");
  return lines.join("\n");
}

export async function createIssue(token: string, input: Record<string, unknown>): Promise<string> {
  const owner = required(input, "owner");
  const repo = required(input, "repo");
  const title = required(input, "title");
  const body = optional(input, "body", "");
  const payload: { title: string; body?: string } = { title };
  if (body) payload.body = body;
  const resp = await githubPost(token, `/repos/${owner}/${repo}/issues`, payload);
  const i: GitHubIssue = resp.json();
  return `Created issue #${i.number}: ${i.html_url}`;
}
