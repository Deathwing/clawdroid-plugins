// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { slackPost, slackGet } from "../api";

export async function sendMessage(
  token: string,
  channel: string,
  text: string,
  threadTs?: string,
): Promise<string> {
  const body: Record<string, unknown> = { channel, text };
  if (threadTs) body.thread_ts = threadTs;
  const resp = await slackPost(token, "chat.postMessage", body);
  if (!resp.ok) return `Error ${resp.status}: ${resp.text()}`;
  const data = resp.json();
  if (!data.ok) return `Slack API error: ${data.error}`;
  return `Message sent (ts: ${data.ts})`;
}

export async function searchMessages(
  token: string,
  query: string,
  limit?: number,
): Promise<string> {
  const params: Record<string, string> = { query };
  if (limit) params.count = String(limit);
  const resp = await slackGet(token, "search.messages", params);
  if (!resp.ok) return `Error ${resp.status}: ${resp.text()}`;
  const data = resp.json();
  if (!data.ok) return `Slack API error: ${data.error}`;
  const matches = (data.messages?.matches || []).map((m: any) => ({
    channel: m.channel?.name || "",
    user: m.username || "",
    text: m.text || "",
    ts: m.ts,
    permalink: m.permalink || "",
  }));
  return JSON.stringify(matches, null, 2);
}

export async function addReaction(
  token: string,
  channel: string,
  timestamp: string,
  emoji: string,
): Promise<string> {
  const resp = await slackPost(token, "reactions.add", {
    channel,
    timestamp,
    name: emoji,
  });
  if (!resp.ok) return `Error ${resp.status}: ${resp.text()}`;
  const data = resp.json();
  if (!data.ok) return `Slack API error: ${data.error}`;
  return `Reaction :${emoji}: added`;
}
