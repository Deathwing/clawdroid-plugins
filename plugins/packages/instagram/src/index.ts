// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

/**
 * ClawDroid Instagram Plugin — entry point
 *
 * Exports `discoverTools()` and `execute()` as required by JsPluginEngine.
 * Tools are declared in manifest.json, so discoverTools() returns [].
 */

import type { PluginContext, ToolResult, ToolError } from "../../../quickjs.d";
import { getProfile } from "./tools/profile";
import { listMedia, getMedia, createMedia, publishMedia } from "./tools/media";
import { listComments, replyComment } from "./tools/comments";
import { getInsights } from "./tools/insights";
import { errorResult } from "./result";

type ToolInput = Record<string, unknown>;
type NotificationPayload = {
  packageName: string;
  appName?: string;
  title?: string;
  text?: string;
  bigText?: string;
  conversationTitle?: string;
  timestamp?: number;
  messages?: Array<{ sender?: string; text?: string }>;
};

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
    return errorResult(
      "Instagram not connected. Sign in via Plugin settings.",
      "Instagram connection required",
    );
  }

  try {
    let result: ToolResult;
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
        return errorResult(`Unknown Instagram tool: ${toolName}`, "Unsupported Instagram tool");
    }

    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return errorResult(message, "Instagram request failed");
  }
}

export function parseNotification(
  _appType: string,
  notification: NotificationPayload,
): Record<string, string> | null {
  const title = notification.title?.trim();
  const text = notification.text?.trim();
  if (!title || !text) {
    return null;
  }

  if (
    title === "Instagram" &&
    (text.includes("liked") || text.includes("started following"))
  ) {
    return null;
  }

  return {
    moduleType: "message",
    sender: title,
    text,
  };
}
