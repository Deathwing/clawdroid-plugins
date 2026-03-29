// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

/**
 * ClawDroid Instagram Plugin — entry point
 *
 * Exports `discoverTools()` and `execute()` as required by JsPluginEngine.
 * Tools are declared in manifest.json, so discoverTools() returns [].
 */

import type { PluginContext, ToolResult, ToolError } from "../../../clawdroid.d";
import { getProfile } from "./tools/profile";
import { listMedia, getMedia, createMedia, publishMedia } from "./tools/media";
import { listComments, replyComment } from "./tools/comments";
import { getInsights } from "./tools/insights";

type ToolInput = Record<string, unknown>;

export function discoverTools(): [] {
  return [];
}

export async function execute(
  toolName: string,
  input: ToolInput,
  ctx: PluginContext,
): Promise<ToolResult | ToolError> {
  const token = await ctx.host.getSecret("token");
  if (!token) {
    return { error: true, message: "Instagram not connected. Sign in via Plugin settings." };
  }

  let result: string;
  switch (toolName) {
    case "instagram_get_profile":
      result = await getProfile(token);
      break;
    case "instagram_list_media":
      result = await listMedia(token, input);
      break;
    case "instagram_get_media":
      result = await getMedia(token, input);
      break;
    case "instagram_create_media":
      result = await createMedia(token, input);
      break;
    case "instagram_publish_media":
      result = await publishMedia(token, input);
      break;
    case "instagram_list_comments":
      result = await listComments(token, input);
      break;
    case "instagram_reply_comment":
      result = await replyComment(token, input);
      break;
    case "instagram_get_insights":
      result = await getInsights(token, input);
      break;
    default:
      return { error: true, message: `Unknown Instagram tool: ${toolName}` };
  }

  return { message: result };
}
