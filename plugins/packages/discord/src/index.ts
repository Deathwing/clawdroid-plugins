/**
 * ClawDroid Discord Plugin — entry point
 *
 * Exports:
 * - discoverTools() + execute() — tool execution (QuickJS sandbox)
 * - matchEvent() — per-automation event filtering
 * - formatLabel() — human-readable trigger label
 * - buildConfig() — build trigger config from input
 *
 * NOTE: No checkTrigger() — the discord_message trigger uses a Node.js
 * WebSocket worker (worker.js) instead of QuickJS polling.
 */

import type { PluginContext, ToolResult, ToolError } from "../../../quickjs.d";
import {
  sendMessage,
  listGuilds,
  listChannels,
  readMessages,
  getGuild,
  createReaction,
  getUser,
  createChannel,
} from "./tools/channels";
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

/** Tool definitions are declared in manifest.json — nothing to discover at runtime */
export function discoverTools(): [] {
  return [];
}

/**
 * Dispatch a tool call to the appropriate handler.
 */
export async function execute(
  toolName: string,
  input: ToolInput,
  ctx: PluginContext,
): Promise<ToolResult | ToolError> {
  const token = await ctx.host.getSecret("token");
  if (!token) {
    return errorResult(
      "Discord not connected. Add your bot token in Plugin settings.",
      "Discord connection required",
    );
  }

  try {
    switch (toolName) {
      case "discord_send_message":
        return await sendMessage(token, String(input.channel_id || ""), String(input.content || ""));
      case "discord_list_guilds":
        return await listGuilds(token);
      case "discord_list_channels":
        return await listChannels(token, String(input.guild_id || ""));
      case "discord_read_messages":
        return await readMessages(token, String(input.channel_id || ""), Number(input.limit) || 20);
      case "discord_get_guild":
        return await getGuild(token, String(input.guild_id || ""));
      case "discord_create_reaction":
        return await createReaction(
          token,
          String(input.channel_id || ""),
          String(input.message_id || ""),
          String(input.emoji || ""),
        );
      case "discord_get_user":
        return await getUser(token);
      case "discord_create_channel":
        return await createChannel(
          token,
          String(input.guild_id || ""),
          String(input.name || ""),
          Number(input.type) || 0,
          input.topic ? String(input.topic) : undefined,
        );
      default:
        return errorResult(`Unknown Discord tool: ${toolName}`, "Unsupported Discord tool");
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return errorResult(message, "Discord request failed");
  }
}

// ─── Trigger Exports ────────────────────────────────────────

export function matchEvent(
  _triggerType: string,
  config: Record<string, unknown>,
  eventData: Record<string, string>,
): Record<string, string> | null {
  const channelFilter = (config.channelId || config.channel_id) as string | undefined;
  const fromUser = (config.fromUser || config.from_user) as string | undefined;

  if (channelFilter && eventData.channel_id !== channelFilter) return null;
  if (fromUser && !eventData.author?.toLowerCase().includes(fromUser.toLowerCase())) return null;

  return eventData;
}

export function formatLabel(
  _triggerType: string,
  config: Record<string, unknown>,
): string {
  const channelId = (config.channelId || config.channel_id) as string | undefined;
  const fromUser = (config.fromUser || config.from_user) as string | undefined;
  let label = "Discord";
  if (channelId) label += ` #${channelId}`;
  if (fromUser) label += ` from ${fromUser}`;
  if (!channelId && !fromUser) label += " (any message)";
  return label;
}

export function buildConfig(
  _triggerType: string,
  input: Record<string, unknown>,
): Record<string, unknown> {
  const cfg: Record<string, string> = {};
  const channelId = input.channel_id as string | undefined;
  const fromUser = input.from_user as string | undefined;
  if (channelId) cfg.channelId = channelId;
  if (fromUser) cfg.fromUser = fromUser;
  return cfg;
}

export function parseNotification(
  _appType: string,
  notification: NotificationPayload,
): Record<string, string> | null {
  const messages = notification.messages || [];
  if (messages.length > 0) {
    const last = messages[messages.length - 1];
    const sender = last.sender?.trim();
    const text = last.text?.trim();
    if (!sender || !text) {
      return null;
    }

    return {
      moduleType: "message",
      sender,
      text,
      groupName: notification.conversationTitle?.trim() || "",
    };
  }

  const sender = notification.title?.trim();
  const text = notification.text?.trim();
  if (!sender || !text) {
    return null;
  }

  return {
    moduleType: "message",
    sender,
    text,
  };
}
