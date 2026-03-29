// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { githubGet } from "../api";
import type { GitHubUser } from "../types";

export async function getUser(token: string): Promise<string> {
  const resp = await githubGet(token, "/user");
  const u: GitHubUser = resp.json();
  const lines: string[] = [
    `User: ${u.login || "unknown"}`,
  ];
  if (u.name) lines.push(`Name: ${u.name}`);
  if (u.bio) lines.push(`Bio: ${u.bio}`);
  lines.push(`Public repos: ${u.public_repos || 0}`);
  lines.push(`Private repos: ${u.total_private_repos || 0}`);
  return lines.join("\n");
}
