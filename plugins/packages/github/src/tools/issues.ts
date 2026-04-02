// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import type { ToolResult } from "../../../quickjs.d";
import { githubGet, githubPost } from "../api";
import { required, optional } from "../params";
import { clipText, keyValueTable, pluralize, statusBlock, successResult, tableBlock, textBlock } from "../result";
import type { GitHubIssue } from "../types";

export async function listIssues(token: string, input: Record<string, unknown>): Promise<ToolResult> {
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
  if (!filtered.length) {
    return successResult(
      "No issues found.",
      "0 issues found",
      [statusBlock(`No ${state} issues found for ${owner}/${repo}.`)],
    );
  }

  const rows = filtered.map((issue) => {
    const labels = (issue.labels || []).map((label) => label.name).join(", ");
    const user = issue.user?.login || "unknown";
    return [
      `#${issue.number}`,
      clipText(issue.title, 60),
      issue.state,
      labels || "-",
      user,
    ];
  });

  const message = filtered
    .map((issue) => {
      const labels = (issue.labels || []).map((label) => label.name).join(", ");
      const user = issue.user?.login || "unknown";
      return `#${issue.number} ${issue.title}${labels ? ` [${labels}]` : ""} (by ${user})`;
    })
    .join("\n");

  return successResult(
    message,
    `${filtered.length} ${pluralize(filtered.length, "issue")} found`,
    [
      statusBlock(`Found ${filtered.length} ${pluralize(filtered.length, "issue")} for ${owner}/${repo}.`),
      tableBlock(["Issue", "Title", "State", "Labels", "Author"], rows),
    ],
  );
}

export async function getIssue(token: string, input: Record<string, unknown>): Promise<ToolResult> {
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

  const blocks = [
    statusBlock(`Loaded issue #${i.number} from ${owner}/${repo}.`),
    keyValueTable([
      ["Issue", `#${i.number}`],
      ["Title", i.title],
      ["State", i.state],
      ["Author", i.user?.login || "unknown"],
      ["Labels", labels],
      ["Created", i.created_at],
      ["Updated", i.updated_at],
      ["URL", i.html_url],
    ]),
  ];
  if (i.body) {
    blocks.push(textBlock(clipText(i.body, 600)));
  }

  return successResult(lines.join("\n"), `Issue ${owner}/${repo}#${i.number}`, blocks);
}

export async function createIssue(token: string, input: Record<string, unknown>): Promise<ToolResult> {
  const owner = required(input, "owner");
  const repo = required(input, "repo");
  const title = required(input, "title");
  const body = optional(input, "body", "");
  const payload: { title: string; body?: string } = { title };
  if (body) payload.body = body;
  const resp = await githubPost(token, `/repos/${owner}/${repo}/issues`, payload);
  const i: GitHubIssue = resp.json();
  const message = `Created issue #${i.number}: ${i.html_url}`;
  return successResult(message, "Issue created", [
    statusBlock(`Created issue #${i.number} in ${owner}/${repo}.`),
    keyValueTable([
      ["Issue", `#${i.number}`],
      ["Title", i.title],
      ["URL", i.html_url],
    ]),
  ]);
}
