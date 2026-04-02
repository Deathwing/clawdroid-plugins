// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import type { ToolResult } from "../../../quickjs.d";
import { githubGet } from "../api";
import { required, optional } from "../params";
import { clipText, keyValueTable, pluralize, statusBlock, successResult, tableBlock, textBlock } from "../result";
import type { GitHubPullRequest } from "../types";

export async function listPullRequests(
  token: string,
  input: Record<string, unknown>,
): Promise<ToolResult> {
  const owner = required(input, "owner");
  const repo = required(input, "repo");
  const state = optional(input, "state", "open");
  const perPage = optional(input, "per_page", 20);
  const resp = await githubGet(
    token,
    `/repos/${owner}/${repo}/pulls?state=${state}&per_page=${perPage}`,
  );
  const prs: GitHubPullRequest[] = resp.json();
  if (!prs.length) {
    return successResult(
      "No pull requests found.",
      "0 pull requests found",
      [statusBlock(`No ${state} pull requests found for ${owner}/${repo}.`)],
    );
  }

  const rows = prs.map((pr) => [
    `#${pr.number}`,
    clipText(pr.title, 60),
    `${pr.head?.ref || "?"} → ${pr.base?.ref || "?"}`,
    pr.state,
    pr.user?.login || "unknown",
  ]);

  const message = prs
    .map((pr) => `#${pr.number} ${pr.title} (${pr.head?.ref || "?"} → ${pr.base?.ref || "?"}) by ${pr.user?.login || "unknown"}`)
    .join("\n");

  return successResult(
    message,
    `${prs.length} pull ${pluralize(prs.length, "request", "requests")} found`,
    [
      statusBlock(`Found ${prs.length} pull ${pluralize(prs.length, "request", "requests")} for ${owner}/${repo}.`),
      tableBlock(["PR", "Title", "Branch", "State", "Author"], rows),
    ],
  );
}

export async function getPullRequest(
  token: string,
  input: Record<string, unknown>,
): Promise<ToolResult> {
  const owner = required(input, "owner");
  const repo = required(input, "repo");
  const number = required(input, "number");
  const resp = await githubGet(token, `/repos/${owner}/${repo}/pulls/${number}`);
  const p: GitHubPullRequest = resp.json();
  const message = [
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

  const blocks = [
    statusBlock(`Loaded pull request #${p.number} from ${owner}/${repo}.`),
    keyValueTable([
      ["PR", `#${p.number}`],
      ["Title", p.title],
      ["State", p.state],
      ["Author", p.user?.login || "unknown"],
      ["Branch", `${p.head?.ref || "?"} → ${p.base?.ref || "?"}`],
      ["Mergeable", p.mergeable === null ? "unknown" : String(p.mergeable)],
      ["Additions", `+${p.additions ?? "?"}`],
      ["Deletions", `-${p.deletions ?? "?"}`],
      ["Changed files", String(p.changed_files ?? "?")],
      ["Created", p.created_at],
      ["URL", p.html_url],
    ]),
  ];
  if (p.body) {
    blocks.push(textBlock(clipText(p.body, 600)));
  }

  return successResult(message, `PR ${owner}/${repo}#${p.number}`, blocks);
}
