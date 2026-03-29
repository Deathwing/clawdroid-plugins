// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

/** GitHub API response types */

export interface GitHubUser {
  login: string;
  name?: string;
  bio?: string;
  public_repos: number;
  total_private_repos?: number;
}

export interface GitHubRepo {
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  default_branch: string;
  private: boolean;
  html_url: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  body: string | null;
  user: { login: string } | null;
  labels: { name: string }[];
  pull_request?: unknown;
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  state: string;
  body: string | null;
  user: { login: string } | null;
  head: { ref: string } | null;
  base: { ref: string } | null;
  mergeable: boolean | null;
  additions: number;
  deletions: number;
  changed_files: number;
  created_at: string;
  html_url: string;
}

export interface GitHubBranch {
  name: string;
  commit: { sha: string };
}

export interface GitHubContent {
  type: "file" | "dir" | "symlink" | "submodule";
  content?: string;
  size?: number;
}

export interface GitHubSearchResult<T> {
  total_count: number;
  items: T[];
}

export interface GitHubCodeResult {
  name: string;
  path: string;
  html_url: string;
  repository: { full_name: string };
}
