// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { githubGet, githubPost, githubDelete } from "../api";
import { required, optional } from "../params";
import type { GitHubRepo, GitHubSearchResult } from "../types";

export async function listRepos(token: string, input: Record<string, unknown>): Promise<string> {
  const perPage = optional(input, "per_page", 30);
  const sort = optional(input, "sort", "updated");
  const type = optional(input, "type", "all");
  const resp = await githubGet(token, `/user/repos?per_page=${perPage}&sort=${sort}&type=${type}`);
  const repos: GitHubRepo[] = resp.json();
  if (!repos.length) return "No repositories found.";
  return repos
    .map((r) => {
      const vis = r.private ? "private" : "public";
      const lang = r.language ? ` (${r.language})` : "";
      return `${r.full_name} [${vis}] ★${r.stargazers_count || 0}${lang} — ${r.description || ""}`;
    })
    .join("\n");
}

export async function getRepo(token: string, input: Record<string, unknown>): Promise<string> {
  const owner = required(input, "owner");
  const repo = required(input, "repo");
  const resp = await githubGet(token, `/repos/${owner}/${repo}`);
  const r: GitHubRepo = resp.json();
  return [
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
}

export async function searchRepos(token: string, input: Record<string, unknown>): Promise<string> {
  const query = required(input, "query");
  const perPage = optional(input, "per_page", 10);
  const encoded = encodeURIComponent(query);
  const resp = await githubGet(token, `/search/repositories?q=${encoded}&per_page=${perPage}`);
  const obj: GitHubSearchResult<GitHubRepo> = resp.json();
  const items = obj.items || [];
  if (!items.length) return "No results found.";
  const lines = items.map((r) => {
    const lang = r.language ? ` (${r.language})` : "";
    return `${r.full_name} ★${r.stargazers_count || 0}${lang} — ${r.description || ""}`;
  });
  return `${obj.total_count} results:\n${lines.join("\n")}`;
}

export async function createRepo(token: string, input: Record<string, unknown>): Promise<string> {
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
  return [
    `Created repository: ${r.full_name}`,
    `URL: ${r.html_url}`,
    `Private: ${r.private}`,
    `Default branch: ${r.default_branch || "main"}`,
  ].join("\n");
}

export async function deleteRepo(token: string, input: Record<string, unknown>): Promise<string> {
  const owner = required(input, "owner");
  const repo = required(input, "repo");
  const resp = await githubDelete(token, `/repos/${owner}/${repo}`);
  if (resp.status === 204) {
    return `Deleted repository: ${owner}/${repo}`;
  }
  const body = resp.json();
  return `Failed to delete ${owner}/${repo}: ${body.message || resp.status}`;
}
