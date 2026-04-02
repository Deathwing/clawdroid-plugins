// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import type { ToolResult } from "../../../quickjs.d";
import { githubGet } from "../api";
import { keyValueTable, statusBlock, successResult, textBlock } from "../result";
import type { GitHubUser } from "../types";

export async function getUser(token: string): Promise<ToolResult> {
  const resp = await githubGet(token, "/user");
  const u: GitHubUser = resp.json();
  const lines: string[] = [
    `User: ${u.login || "unknown"}`,
  ];
  if (u.name) lines.push(`Name: ${u.name}`);
  if (u.bio) lines.push(`Bio: ${u.bio}`);
  lines.push(`Public repos: ${u.public_repos || 0}`);
  lines.push(`Private repos: ${u.total_private_repos || 0}`);

  const blocks = [
    statusBlock(`Loaded GitHub profile for ${u.login || "unknown"}.`),
    keyValueTable([
      ["User", u.login || "unknown"],
      ["Name", u.name || ""],
      ["Public repos", String(u.public_repos || 0)],
      ["Private repos", String(u.total_private_repos || 0)],
    ]),
  ];
  if (u.bio) {
    blocks.push(textBlock(u.bio));
  }

  return successResult(lines.join("\n"), `GitHub user ${u.login || "unknown"}`, blocks);
}
