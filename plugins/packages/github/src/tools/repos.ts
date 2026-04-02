// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import type { ToolResult } from "../../../quickjs.d";
import { githubGet, githubPost, githubDelete } from "../api";
import { required, optional } from "../params";
import {
  clipText,
  failureResult,
  formatCount,
  keyValueTable,
  pluralize,
  statusBlock,
  successResult,
  tableBlock,
  textBlock,
  yesNo,
} from "../result";
import type { GitHubRepo, GitHubSearchResult } from "../types";

export async function listRepos(token: string, input: Record<string, unknown>): Promise<ToolResult> {
  const perPage = optional(input, "per_page", 30);
  const sort = optional(input, "sort", "updated");
  const type = optional(input, "type", "all");
  const resp = await githubGet(token, `/user/repos?per_page=${perPage}&sort=${sort}&type=${type}`);
  const repos: GitHubRepo[] = resp.json();
  if (!repos.length) {
    return successResult(
      "No repositories found.",
      "0 repositories found",
      [statusBlock("No repositories found.")],
    );
  }

  const lines = [`Repositories (${repos.length}):`, ""];
  const rows = repos.map((repo, index) => {
    const visibility = repo.private ? "private" : "public";
    lines.push(`${index + 1}. ${repo.full_name} [${visibility}] ★${repo.stargazers_count || 0}${repo.language ? ` (${repo.language})` : ""}`);
    if (repo.description) {
      lines.push(`   ${repo.description}`);
    }
    lines.push("");
    return [
      String(index + 1),
      repo.full_name,
      visibility,
      formatCount(repo.stargazers_count),
      repo.language || "-",
    ];
  });

  return successResult(
    lines.join("\n").trim(),
    `${repos.length} ${pluralize(repos.length, "repository")} found`,
    [
      statusBlock(`Found ${repos.length} ${pluralize(repos.length, "repository")}.`),
      tableBlock(["#", "Repository", "Visibility", "Stars", "Language"], rows),
    ],
  );
}

export async function getRepo(token: string, input: Record<string, unknown>): Promise<ToolResult> {
  const owner = required(input, "owner");
  const repo = required(input, "repo");
  const resp = await githubGet(token, `/repos/${owner}/${repo}`);
  const r: GitHubRepo = resp.json();
  const message = [
    `Repository: ${r.full_name}`,
    `Description: ${r.description || "none"}`,
    `Language: ${r.language || "unknown"}`,
    `Stars: ${r.stargazers_count || 0}`,
    `Forks: ${r.forks_count || 0}`,
    `Open issues: ${r.open_issues_count || 0}`,
    `Default branch: ${r.default_branch || "main"}`,
    `Private: ${r.private || false}`,
    `URL: ${r.html_url}`,
  ].join("\n");

  const blocks = [
    statusBlock(`Loaded repository ${r.full_name}.`),
    keyValueTable([
      ["Repository", r.full_name],
      ["Language", r.language || "unknown"],
      ["Stars", formatCount(r.stargazers_count)],
      ["Forks", formatCount(r.forks_count)],
      ["Open issues", formatCount(r.open_issues_count)],
      ["Default branch", r.default_branch || "main"],
      ["Private", yesNo(Boolean(r.private))],
      ["URL", r.html_url],
    ]),
  ];
  if (r.description) {
    blocks.push(textBlock(r.description));
  }

  return successResult(message, `Repository ${r.full_name}`, blocks);
}

export async function searchRepos(token: string, input: Record<string, unknown>): Promise<ToolResult> {
  const query = required(input, "query");
  const perPage = optional(input, "per_page", 10);
  const encoded = encodeURIComponent(query);
  const resp = await githubGet(token, `/search/repositories?q=${encoded}&per_page=${perPage}`);
  const obj: GitHubSearchResult<GitHubRepo> = resp.json();
  const items = obj.items || [];
  if (!items.length) {
    return successResult(
      "No results found.",
      "0 repositories found",
      [statusBlock(`No repository results found for "${query}".`)],
    );
  }

  const lines = [`Repository search results for "${query}" (${obj.total_count} total):`, ""];
  const rows = items.map((repo, index) => {
    lines.push(`${index + 1}. ${repo.full_name} ★${repo.stargazers_count || 0}${repo.language ? ` (${repo.language})` : ""}`);
    if (repo.description) {
      lines.push(`   ${repo.description}`);
    }
    lines.push("");
    return [
      String(index + 1),
      repo.full_name,
      formatCount(repo.stargazers_count),
      repo.language || "-",
      clipText(repo.description, 80) || "-",
    ];
  });

  return successResult(
    lines.join("\n").trim(),
    `${items.length} ${pluralize(items.length, "repository")} found for "${query}"`,
    [
      statusBlock(`Found ${items.length} ${pluralize(items.length, "repository")} for "${query}".`),
      tableBlock(["#", "Repository", "Stars", "Language", "Description"], rows),
    ],
  );
}

export async function createRepo(token: string, input: Record<string, unknown>): Promise<ToolResult> {
  const name = required(input, "name");
  const description = optional(input, "description", "");
  const isPrivate = optional(input, "private", false);
  const autoInit = optional(input, "auto_init", true);
  const payload: Record<string, unknown> = {
    name,
    auto_init: String(autoInit) === "true",
  };
  if (description) payload.description = description;
  payload.private = String(isPrivate) === "true";
  const resp = await githubPost(token, "/user/repos", payload);
  const r: GitHubRepo = resp.json();
  const message = [
    `Created repository: ${r.full_name}`,
    `URL: ${r.html_url}`,
    `Private: ${r.private}`,
    `Default branch: ${r.default_branch || "main"}`,
  ].join("\n");

  const blocks = [
    statusBlock(`Created repository ${r.full_name}.`),
    keyValueTable([
      ["Repository", r.full_name],
      ["URL", r.html_url],
      ["Private", yesNo(Boolean(r.private))],
      ["Default branch", r.default_branch || "main"],
    ]),
  ];
  if (description) {
    blocks.push(textBlock(description));
  }

  return successResult(message, `Created ${r.full_name}`, blocks);
}

export async function deleteRepo(token: string, input: Record<string, unknown>): Promise<ToolResult> {
  const owner = required(input, "owner");
  const repo = required(input, "repo");
  const resp = await githubDelete(token, `/repos/${owner}/${repo}`);
  if (resp.status === 204) {
    const message = `Deleted repository: ${owner}/${repo}`;
    return successResult(message, `Deleted ${owner}/${repo}`, [statusBlock(message)]);
  }
  const body = resp.json();
  return failureResult(
    `Failed to delete ${owner}/${repo}: ${body.message || resp.status}`,
    `Delete failed for ${owner}/${repo}`,
  );
}
