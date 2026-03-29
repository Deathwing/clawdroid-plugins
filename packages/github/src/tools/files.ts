// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { githubGet } from "../api";
import { required, optional } from "../params";
import type { GitHubContent } from "../types";

export async function getFileContents(
  token: string,
  input: Record<string, unknown>,
): Promise<string> {
  const owner = required(input, "owner");
  const repo = required(input, "repo");
  const path = required(input, "path");
  const ref = optional<string | null>(input, "ref", null);
  let url = `/repos/${owner}/${repo}/contents/${path}`;
  if (ref) url += `?ref=${ref}`;
  const resp = await githubGet(token, url);
  const obj: GitHubContent = resp.json();
  if (obj.type === "file") {
    if (obj.content) {
      try {
        return atob(obj.content.replace(/\n/g, ""));
      } catch {
        return `(binary file, ${obj.size ?? "?"} bytes)`;
      }
    }
    return "(empty file)";
  }
  if (obj.type === "dir") {
    return "This is a directory. Use github_list_repos or ls the path.";
  }
  return JSON.stringify(obj);
}
