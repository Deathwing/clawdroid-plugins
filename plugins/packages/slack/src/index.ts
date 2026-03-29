// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

/**
 * ClawDroid Slack Plugin — entry point
 *
 * Exports:
 * - discoverTools() + execute() — tool execution
 * - checkTrigger() — polling triggers
 * - matchEvent() — per-automation event filtering
 * - formatLabel() — human-readable trigger label
 * - buildConfig() — build trigger config from input
 */

import type { PluginContext, ToolResult, ToolError } from "../../../quickjs.d";
import { slackGet } from "./api";
import { listChannels, readChannel, readChannelRaw, getChannelInfo } from "./tools/channels";
import { sendMessage, searchMessages, addReaction } from "./tools/messages";
import { listUsers, getUser } from "./tools/users";

type ToolInput = Record<string, unknown>;

/** Tool definitions are declared in manifest.json */
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
    return { error: true, message: "Slack not connected. Add your bot token in Settings first." };
  }

  let result: string;
  switch (toolName) {
    case "slack_send_message":
      result = await sendMessage(
        token,
        String(input.channel || ""),
        String(input.text || ""),
        input.thread_ts ? String(input.thread_ts) : undefined,
      );
      break;
    case "slack_list_channels":
      result = await listChannels(token, input.limit ? Number(input.limit) : undefined);
      break;
    case "slack_read_channel":
      result = await readChannel(
        token,
        String(input.channel || ""),
        input.limit ? Number(input.limit) : undefined,
      );
      break;
    case "slack_list_users":
      result = await listUsers(token, input.limit ? Number(input.limit) : undefined);
      break;
    case "slack_get_user":
      result = await getUser(token, String(input.user_id || ""));
      break;
    case "slack_search_messages":
      result = await searchMessages(
        token,
        String(input.query || ""),
        input.limit ? Number(input.limit) : undefined,
      );
      break;
    case "slack_add_reaction":
      result = await addReaction(
        token,
        String(input.channel || ""),
        String(input.timestamp || ""),
        String(input.emoji || ""),
      );
      break;
    case "slack_auth_test": {
      const resp = await slackGet(token, "auth.test");
      if (!resp.ok) {
        result = `Error ${resp.status}: ${resp.text()}`;
      } else {
        const data = resp.json();
        if (!data.ok) {
          result = `Slack API error: ${data.error}`;
        } else {
          result = JSON.stringify({ team: data.team, user: data.user, url: data.url }, null, 2);
        }
      }
      break;
    }
    default:
      return { error: true, message: `Unknown Slack tool: ${toolName}` };
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
  if (triggerType !== "slack_message") {
    return { events: [], state };
  }

  const token = await ctx.host.getSecret("token");
  if (!token) return { events: [], state };

  const channel = config.channel as string | undefined;
  if (!channel) return { events: [], state };

  const latestTs = state.latest_ts as string | undefined;
  const { messages, ok } = await readChannelRaw(token, channel, latestTs, 50);
  if (!ok) return { events: [], state };

  const events: Record<string, string>[] = [];
  let newLatestTs = latestTs;

  for (const m of messages) {
    // Skip bot messages from ourselves to avoid loops
    if (m.subtype === "bot_message") continue;

    const ts = m.ts as string;
    if (latestTs && ts <= latestTs) continue;

    events.push({
      channel: channel,
      user: m.user || m.bot_id || "unknown",
      text: m.text || "",
      ts: ts,
    });

    if (!newLatestTs || ts > newLatestTs) {
      newLatestTs = ts;
    }
  }

  return { events, state: { ...state, latest_ts: newLatestTs } };
}

export function matchEvent(
  _triggerType: string,
  _config: Record<string, unknown>,
  eventData: Record<string, string>,
): Record<string, string> | null {
  return eventData;
}

export function formatLabel(
  triggerType: string,
  config: Record<string, unknown>,
): string {
  const channel = config.channel as string | undefined;
  if (channel) {
    return `New message in #${channel}`;
  }
  return "New Slack message";
}

export function buildConfig(
  _triggerType: string,
  input: Record<string, unknown>,
): Record<string, unknown> {
  const cfg: Record<string, string> = {};
  if (input.channel) cfg.channel = String(input.channel);
  return cfg;
}
