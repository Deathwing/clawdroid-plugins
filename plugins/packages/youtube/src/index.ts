// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

/**
 * ClawDroid YouTube Plugin — entry point
 *
 * Exports:
 * - discoverTools() + execute() — tool execution
 */

import type { PluginContext, ToolResult, ToolError } from "../../../quickjs.d";
import { search } from "./tools/search";
import { getVideo, rateVideo } from "./tools/videos";
import { listMyPlaylists, getPlaylistItems, addToPlaylist, createPlaylist, removeFromPlaylist } from "./tools/playlists";
import { getChannel, listSubscriptions } from "./tools/channels";

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
    return { error: true, message: "YouTube not connected. Connect in Settings → Plugins → YouTube first." };
  }

  try {
    let result: string;
    switch (toolName) {
      case "youtube_search":
        result = await search(token, input);
        break;
      case "youtube_get_video":
        result = await getVideo(token, input);
        break;
      case "youtube_rate_video":
        result = await rateVideo(token, input);
        break;
      case "youtube_list_my_playlists":
        result = await listMyPlaylists(token, input);
        break;
      case "youtube_get_playlist_items":
        result = await getPlaylistItems(token, input);
        break;
      case "youtube_add_to_playlist":
        result = await addToPlaylist(token, input);
        break;
      case "youtube_create_playlist":
        result = await createPlaylist(token, input);
        break;
      case "youtube_remove_from_playlist":
        result = await removeFromPlaylist(token, input);
        break;
      case "youtube_get_channel":
        result = await getChannel(token, input);
        break;
      case "youtube_list_subscriptions":
        result = await listSubscriptions(token, input);
        break;
      default:
        return { error: true, message: `Unknown YouTube tool: ${toolName}` };
    }
    return { message: result };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: true, message: msg };
  }
}
