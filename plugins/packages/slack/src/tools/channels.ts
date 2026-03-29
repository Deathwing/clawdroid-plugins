// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { slackPost, slackGet } from "../api";

export async function listChannels(token: string, limit?: number): Promise<string> {
  const params: Record<string, string> = {};
  if (limit) params.limit = String(limit);
  const resp = await slackGet(token, "conversations.list", params);
  if (!resp.ok) return `Error ${resp.status}: ${resp.text()}`;
  const data = resp.json();
  if (!data.ok) return `Slack API error: ${data.error}`;
  const channels = (data.channels || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    is_private: c.is_private,
    num_members: c.num_members,
    topic: c.topic?.value || "",
  }));
  return JSON.stringify(channels, null, 2);
}

export async function readChannel(
  token: string,
  channel: string,
  limit?: number,
): Promise<string> {
  const params: Record<string, string> = { channel };
  if (limit) params.limit = String(limit);
  else params.limit = "20";
  const resp = await slackGet(token, "conversations.history", params);
  if (!resp.ok) return `Error ${resp.status}: ${resp.text()}`;
  const data = resp.json();
  if (!data.ok) return `Slack API error: ${data.error}`;
  const messages = (data.messages || []).map((m: any) => ({
    user: m.user || m.bot_id || "unknown",
    text: m.text || "",
    ts: m.ts,
    thread_ts: m.thread_ts || undefined,
  }));
  return JSON.stringify(messages, null, 2);
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

export async function getChannelInfo(token: string, channel: string): Promise<string> {
  const resp = await slackGet(token, "conversations.info", { channel });
  if (!resp.ok) return `Error ${resp.status}: ${resp.text()}`;
  const data = resp.json();
  if (!data.ok) return `Slack API error: ${data.error}`;
  const ch = data.channel;
  return JSON.stringify({
    id: ch.id,
    name: ch.name,
    is_private: ch.is_private,
    topic: ch.topic?.value || "",
    purpose: ch.purpose?.value || "",
    num_members: ch.num_members,
    created: ch.created,
  }, null, 2);
}
