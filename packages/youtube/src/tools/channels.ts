// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { ytGet } from "../api";
import { optional } from "../params";
import type { YtListResponse, YtChannel, YtSubscription } from "../types";

export async function getChannel(token: string, input: Record<string, unknown>): Promise<string> {
  const channelId = input["channel_id"] ? String(input["channel_id"]) : null;
  const path = channelId
    ? `/channels?part=snippet,statistics&id=${channelId}`
    : `/channels?part=snippet,statistics&mine=true`;

  const resp = await ytGet(token, path);
  const data = resp.json() as YtListResponse<YtChannel>;

  if (!data.items || data.items.length === 0) {
    return channelId ? `No channel found with ID: ${channelId}` : "Could not retrieve your channel info.";
  }

  const ch = data.items[0];
  const s = ch.snippet;
  const stats = ch.statistics;

  const lines = [`Channel: ${s.title}`, `ID: ${ch.id}`];
  if (s.customUrl) lines.push(`URL: https://www.youtube.com/@${s.customUrl.replace("@", "")}`);
  lines.push(`Created: ${s.publishedAt?.slice(0, 10) ?? "Unknown"}`);
  if (stats) {
    if (!stats.hiddenSubscriberCount) {
      lines.push(`Subscribers: ${Number(stats.subscriberCount).toLocaleString()}`);
    }
    lines.push(`Videos: ${Number(stats.videoCount).toLocaleString()}`);
    lines.push(`Total Views: ${Number(stats.viewCount).toLocaleString()}`);
  }
  if (s.description) {
    lines.push(`\nDescription:\n${s.description.slice(0, 300)}${s.description.length > 300 ? "..." : ""}`);
  }

  return lines.join("\n");
}

export async function listSubscriptions(token: string, input: Record<string, unknown>): Promise<string> {
  const maxResults = optional(input, "max_results", 25);
  const resp = await ytGet(
    token,
    `/subscriptions?part=snippet&mine=true&maxResults=${maxResults}&order=alphabetical`,
  );
  const data = resp.json() as YtListResponse<YtSubscription>;

  if (!data.items || data.items.length === 0) return "No subscriptions found.";

  const lines = [`Subscriptions (${data.pageInfo?.totalResults ?? data.items.length} total):\n`];
  data.items.forEach((sub, i) => {
    const channelId = sub.snippet.resourceId.channelId;
    lines.push(`${i + 1}. ${sub.snippet.title}`);
    lines.push(`   Channel ID: ${channelId} | https://www.youtube.com/channel/${channelId}`);
    lines.push("");
  });

  return lines.join("\n").trim();
}
