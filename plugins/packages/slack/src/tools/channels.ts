// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { slackPost, slackGet } from "../api";
import type { ToolResult } from "../../../quickjs.d";
import { clipText, failureResult, formatSlackTimestamp, keyValueTable, pluralize, statusBlock, successResult, tableBlock } from "../result";

export async function listChannels(token: string, limit?: number): Promise<ToolResult> {
  const params: Record<string, string> = {};
  if (limit) params.limit = String(limit);
  const resp = await slackGet(token, "conversations.list", params);
  if (!resp.ok) return failureResult(`Error ${resp.status}: ${resp.text()}`, "Slack request failed");
  const data = resp.json();
  if (!data.ok) return failureResult(`Slack API error: ${data.error}`, "Slack request failed");
  const channels = (data.channels || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    is_private: c.is_private,
    num_members: c.num_members,
    topic: c.topic?.value || "",
  }));
  if (!channels.length) {
    return successResult("No channels found.", "0 channels found", [statusBlock("No Slack channels found.")]);
  }

  const message = [
    `Channels (${channels.length}):`,
    "",
    ...channels.flatMap((channel: any, index: number) => [
      `${index + 1}. #${channel.name} (${channel.is_private ? "private" : "public"}, members: ${channel.num_members ?? "?"})`,
      ...(channel.topic ? [`   ${channel.topic}`] : []),
      `   ID: ${channel.id}`,
      "",
    ]),
  ].join("\n").trim();

  return successResult(
    message,
    `${channels.length} ${pluralize(channels.length, "channel")} found`,
    [
      statusBlock(`Loaded ${channels.length} Slack ${pluralize(channels.length, "channel")}.`),
      tableBlock(
        ["#", "Channel", "Visibility", "Members", "Topic", "ID"],
        channels.map((channel: any, index: number) => [
          String(index + 1),
          `#${channel.name}`,
          channel.is_private ? "private" : "public",
          String(channel.num_members ?? "?"),
          clipText(channel.topic, 50) || "-",
          channel.id,
        ]),
      ),
    ],
  );
}

export async function readChannel(
  token: string,
  channel: string,
  limit?: number,
): Promise<ToolResult> {
  const params: Record<string, string> = { channel };
  if (limit) params.limit = String(limit);
  else params.limit = "20";
  const resp = await slackGet(token, "conversations.history", params);
  if (!resp.ok) return failureResult(`Error ${resp.status}: ${resp.text()}`, `Read failed for ${channel}`);
  const data = resp.json();
  if (!data.ok) return failureResult(`Slack API error: ${data.error}`, `Read failed for ${channel}`);
  const messages = (data.messages || []).map((m: any) => ({
    user: m.user || m.bot_id || "unknown",
    text: m.text || "",
    ts: m.ts,
    thread_ts: m.thread_ts || undefined,
  }));
  if (!messages.length) {
    return successResult("No messages found.", `0 messages found in ${channel}`, [statusBlock(`No recent messages found in ${channel}.`)]);
  }

  const message = [
    `Messages in ${channel} (${messages.length}):`,
    "",
    ...messages.flatMap((entry: any, index: number) => [
      `${index + 1}. [${formatSlackTimestamp(entry.ts)}] ${entry.user}: ${entry.text || "(no text)"}`,
      ...(entry.thread_ts ? [`   Thread: ${entry.thread_ts}`] : []),
      "",
    ]),
  ].join("\n").trim();

  return successResult(
    message,
    `${messages.length} ${pluralize(messages.length, "message")} found in ${channel}`,
    [
      statusBlock(`Loaded ${messages.length} Slack ${pluralize(messages.length, "message")} from ${channel}.`),
      tableBlock(
        ["#", "User", "Time", "Thread", "Message"],
        messages.map((entry: any, index: number) => [
          String(index + 1),
          entry.user,
          formatSlackTimestamp(entry.ts),
          entry.thread_ts || "-",
          clipText(entry.text, 80) || "-",
        ]),
      ),
    ],
  );
}

export async function readChannelRaw(
  token: string,
  channel: string,
  oldest?: string,
  limit?: number,
): Promise<{ messages: any[]; ok: boolean }> {
  const params: Record<string, string> = { channel };
  if (oldest) params.oldest = oldest;
  if (limit) params.limit = String(limit);
  else params.limit = "50";
  const resp = await slackGet(token, "conversations.history", params);
  if (!resp.ok) return { messages: [], ok: false };
  const data = resp.json();
  return { messages: data.messages || [], ok: data.ok };
}

export async function getChannelInfo(token: string, channel: string): Promise<ToolResult> {
  const resp = await slackGet(token, "conversations.info", { channel });
  if (!resp.ok) return failureResult(`Error ${resp.status}: ${resp.text()}`, `Lookup failed for ${channel}`);
  const data = resp.json();
  if (!data.ok) return failureResult(`Slack API error: ${data.error}`, `Lookup failed for ${channel}`);
  const ch = data.channel;
  const message = [
    `Channel: #${ch.name || channel}`,
    `ID: ${ch.id || channel}`,
    `Visibility: ${ch.is_private ? "private" : "public"}`,
    `Members: ${ch.num_members ?? "?"}`,
    `Topic: ${ch.topic?.value || "(none)"}`,
    `Purpose: ${ch.purpose?.value || "(none)"}`,
  ].join("\n");
  return successResult(message, `Channel ${ch.name || channel}`, [
    statusBlock(`Loaded Slack channel #${ch.name || channel}.`),
    keyValueTable([
      ["Channel", `#${ch.name || channel}`],
      ["ID", ch.id || channel],
      ["Visibility", ch.is_private ? "private" : "public"],
      ["Members", String(ch.num_members ?? "?")],
      ["Created", ch.created ? formatSlackTimestamp(String(ch.created)) : ""],
      ["Topic", ch.topic?.value || ""],
      ["Purpose", ch.purpose?.value || ""],
    ]),
  ]);
}
