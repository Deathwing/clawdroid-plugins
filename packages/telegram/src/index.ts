// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

/**
 * ClawDroid Telegram Plugin — entry point
 *
 * Exports:
 * - discoverTools() + execute() — tool execution
 * - checkTrigger() — polling triggers
 * - matchEvent() — per-automation event filtering
 * - formatLabel() — human-readable trigger label
 * - buildConfig() — build trigger config from input
 */

import type { PluginContext, ToolResult, ToolError } from "./clawdroid.d";
import { sendMessage, getUpdates, getUpdatesRaw, forwardMessage, sendPhoto } from "./tools/messages";
import { getMe, getChat, getChatMemberCount } from "./tools/chats";

type ToolInput = Record<string, unknown>;

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
    return { error: true, message: "Telegram not connected. Add your bot token in Settings first." };
  }

  let result: string;
  switch (toolName) {
    case "telegram_send_message":
      result = await sendMessage(
        token,
        String(input.chat_id || ""),
        String(input.text || ""),
        input.parse_mode ? String(input.parse_mode) : undefined,
      );
      break;
    case "telegram_get_me":
      result = await getMe(token);
      break;
    case "telegram_get_chat":
      result = await getChat(token, String(input.chat_id || ""));
      break;
    case "telegram_get_updates":
      result = await getUpdates(
        token,
        input.limit ? Number(input.limit) : 10,
      );
      break;
    case "telegram_forward_message":
      result = await forwardMessage(
        token,
        String(input.chat_id || ""),
        String(input.from_chat_id || ""),
        String(input.message_id || ""),
      );
      break;
    case "telegram_send_photo":
      result = await sendPhoto(
        token,
        String(input.chat_id || ""),
        String(input.photo_url || ""),
        input.caption ? String(input.caption) : undefined,
      );
      break;
    default:
      return { error: true, message: `Unknown Telegram tool: ${toolName}` };
  }

  return { message: result };
}

// ─── Trigger Exports ────────────────────────────────────────

export async function checkTrigger(
  triggerType: string,
  config: Record<string, unknown>,
  state: Record<string, unknown>,
  ctx: PluginContext,
): Promise<{ events: Record<string, string>[]; state: Record<string, unknown> }> {
  if (triggerType !== "telegram_message") {
    return { events: [], state };
  }

  const token = await ctx.host.getSecret("token");
  if (!token) return { events: [], state };

  const offset = state.offset as number | undefined;
  const updates = await getUpdatesRaw(token, 100, offset);

  const events: Record<string, string>[] = [];
  let newOffset = offset;

  for (const u of updates) {
    const msg = u.message || u.edited_message || u.channel_post;
    if (!msg) continue;

    events.push({
      chat_id: String(msg.chat?.id || ""),
      from_name: msg.from?.first_name || msg.from?.username || "unknown",
      text: msg.text || "",
      message_id: String(msg.message_id || ""),
      date: msg.date ? new Date(msg.date * 1000).toISOString() : "",
    });

    const uid = u.update_id as number;
    if (newOffset === undefined || uid >= newOffset) {
      newOffset = uid + 1;
    }
  }

  return { events, state: { ...state, offset: newOffset } };
}

export function matchEvent(
  _triggerType: string,
  config: Record<string, unknown>,
  eventData: Record<string, string>,
): Record<string, string> | null {
  const chatFilter = config.chat_id as string | undefined;
  if (chatFilter && eventData.chat_id !== chatFilter) {
    return null;
  }
  return eventData;
}

export function formatLabel(
  triggerType: string,
  config: Record<string, unknown>,
): string {
  const chatId = config.chat_id as string | undefined;
  if (chatId) {
    return `New message in ${chatId}`;
  }
  return "New Telegram message";
}

export function buildConfig(
  _triggerType: string,
  input: Record<string, unknown>,
): Record<string, unknown> {
  const cfg: Record<string, string> = {};
  if (input.chat_id) cfg.chat_id = String(input.chat_id);
  return cfg;
}
