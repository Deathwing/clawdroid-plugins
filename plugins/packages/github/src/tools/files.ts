// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import type { ToolResult } from "../../../quickjs.d";
import { githubGet } from "../api";
import { required, optional } from "../params";
import { clipText, statusBlock, successResult } from "../result";
import type { GitHubContent } from "../types";

export async function getFileContents(
  token: string,
  input: Record<string, unknown>,
): Promise<ToolResult> {
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
        return {
          message: atob(obj.content.replace(/\n/g, "")),
          summary: `File ${clipText(path, 72)}`,
          contentPath: path,
        };
      } catch {
        const message = `(binary file, ${obj.size ?? "?"} bytes)`;
        return successResult(message, `Binary file ${clipText(path, 72)}`, [statusBlock(message)]);
      }
    }
    return successResult("(empty file)", `File ${clipText(path, 72)}`, [statusBlock(`Loaded empty file ${path}.`)]);
  }
  if (obj.type === "dir") {
    const message = "This is a directory. Use github_list_repos or ls the path.";
    return successResult(message, `Directory ${clipText(path, 72)}`, [statusBlock(message)]);
  }
  return successResult(JSON.stringify(obj, null, 2), `Content ${clipText(path, 72)}`);
}
