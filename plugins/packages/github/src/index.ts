// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

/**
 * ClawDroid GitHub Plugin — entry point
 *
 * Exports:
 * - discoverTools() + execute() — tool execution
 * - checkTrigger() — polling triggers
 * - matchEvent() — per-automation event filtering
 * - formatLabel() — human-readable trigger label
 * - buildConfig() — build trigger config from input
 */

import type { PluginContext, ToolResult, ToolError } from "../../../quickjs.d";
import { getUser } from "./tools/user";
import { listRepos, getRepo, searchRepos, createRepo, deleteRepo } from "./tools/repos";
import { listIssues, getIssue, createIssue } from "./tools/issues";
import { listPullRequests, getPullRequest } from "./tools/pulls";
import { listBranches } from "./tools/branches";
import { getFileContents } from "./tools/files";
import { searchCode } from "./tools/search";
import { checkNotifications } from "./triggers/notifications";

type ToolInput = Record<string, unknown>;

/** Tool definitions are declared in manifest.json — nothing to discover at runtime */
export function discoverTools(): [] {
  return [];
}

/**
 * Dispatch a tool call to the appropriate handler.
 * Called by JsPluginEngine with (toolName, input, { host }).
 */
export async function execute(
  toolName: string,
  input: ToolInput,
  ctx: PluginContext,
): Promise<ToolResult | ToolError> {
  const token = await ctx.host.getSecret("token");
  if (!token) {
    return { error: true, message: "GitHub not connected. Connect in Settings first." };
  }

  let result: string;
  switch (toolName) {
    case "github_get_user":
      result = await getUser(token);
      break;
    case "github_list_repos":
      result = await listRepos(token, input);
      break;
    case "github_get_repo":
      result = await getRepo(token, input);
      break;
    case "github_list_issues":
      result = await listIssues(token, input);
      break;
    case "github_get_issue":
      result = await getIssue(token, input);
      break;
    case "github_create_issue":
      result = await createIssue(token, input);
      break;
    case "github_list_pull_requests":
      result = await listPullRequests(token, input);
      break;
    case "github_get_pull_request":
      result = await getPullRequest(token, input);
      break;
    case "github_list_branches":
      result = await listBranches(token, input);
      break;
    case "github_get_file_contents":
      result = await getFileContents(token, input);
      break;
    case "github_search_repos":
      result = await searchRepos(token, input);
      break;
    case "github_search_code":
      result = await searchCode(token, input);
      break;
    case "github_create_repo":
      result = await createRepo(token, input);
      break;
    case "github_delete_repo":
      result = await deleteRepo(token, input);
      break;
    default:
      return { error: true, message: `Unknown GitHub tool: ${toolName}` };
  }

  return { message: result };
}

// ─── Trigger Exports ────────────────────────────────────────

export async function checkTrigger(
  triggerType: string,
  config: Record<string, unknown>,
  state: Record<string, unknown>,
  _ctx: PluginContext,
): Promise<{ events: Record<string, string>[]; state: Record<string, unknown> }> {
  return checkNotifications(triggerType, config, state) as any;
}

export function matchEvent(
  _triggerType: string,
  config: Record<string, unknown>,
  eventData: Record<string, string>,
): Record<string, string> | null {
  const repoFilter = config.repo_filter as string | undefined;
  if (repoFilter && eventData.repo?.toLowerCase() !== repoFilter.toLowerCase()) {
    return null;
  }
  return eventData;
}

export function formatLabel(
  triggerType: string,
  config: Record<string, unknown>,
): string {
  const repoFilter = config.repo_filter as string | undefined;
  const suffix = repoFilter ? ` (${repoFilter})` : " (any repo)";
  switch (triggerType) {
    case "github_notification":
      return `GitHub notification${suffix}`;
    case "github_issue_opened":
      return `New issue${suffix}`;
    case "github_pr_opened":
      return `New PR${suffix}`;
    default:
      return "GitHub";
  }
}

export function buildConfig(
  _triggerType: string,
  input: Record<string, unknown>,
): Record<string, unknown> {
  const cfg: Record<string, string> = {};
  if (input.repo_filter) cfg.repo_filter = String(input.repo_filter);
  return cfg;
}
