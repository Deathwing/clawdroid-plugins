// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { ytGet } from "../api";
import { optional } from "../params";
import type { YtListResponse, YtChannel, YtSubscription } from "../types";
import { clipText, formatCount, keyValueTable, pluralize, statusBlock, successResult, tableBlock, textBlock } from "../result";
import { channelUrl } from "../urls";

export async function getChannel(token: string, input: Record<string, unknown>) {
  const channelId = input["channel_id"] ? String(input["channel_id"]) : null;
  const path = channelId
    ? `/channels?part=snippet,statistics&id=${channelId}`
    : `/channels?part=snippet,statistics&mine=true`;

  const resp = await ytGet(token, path);
  const data = resp.json() as YtListResponse<YtChannel>;

  if (!data.items || data.items.length === 0) {
    const message = channelId ? `No channel found with ID: ${channelId}` : "Could not retrieve your channel info.";
    return successResult(message, "Channel not found", [statusBlock(message)]);
  }

  const ch = data.items[0];
  const s = ch.snippet;
  const stats = ch.statistics;

  const url = s.customUrl ? `https://www.youtube.com/@${s.customUrl.replace("@", "")}` : channelUrl(ch.id);
  const lines = [`Channel: ${s.title}`, `ID: ${ch.id}`];
  if (url) lines.push(`URL: ${url}`);
  lines.push(`Created: ${s.publishedAt?.slice(0, 10) ?? "Unknown"}`);
  if (stats) {
    if (!stats.hiddenSubscriberCount) {
      lines.push(`Subscribers: ${formatCount(stats.subscriberCount)}`);
    }
    lines.push(`Videos: ${formatCount(stats.videoCount)}`);
    lines.push(`Total Views: ${formatCount(stats.viewCount)}`);
  }
  if (s.description) {
    lines.push(`\nDescription:\n${s.description.slice(0, 300)}${s.description.length > 300 ? "..." : ""}`);
  }

  const blocks = [
    statusBlock(`Loaded channel ${s.title}.`),
    keyValueTable([
      ["Channel", s.title],
      ["ID", ch.id],
      ["URL", url],
      ["Created", s.publishedAt?.slice(0, 10) ?? "Unknown"],
      ["Subscribers", stats && !stats.hiddenSubscriberCount ? formatCount(stats.subscriberCount) : "Hidden"],
      ["Videos", stats ? formatCount(stats.videoCount) : "Unknown"],
      ["Total Views", stats ? formatCount(stats.viewCount) : "Unknown"],
    ]),
  ];
  const description = clipText(s.description, 300);
  if (description) {
    blocks.push(textBlock(description));
  }

  return successResult(lines.join("\n"), `Channel: ${clipText(s.title, 72)}`, blocks);
}

export async function listSubscriptions(token: string, input: Record<string, unknown>) {
  const maxResults = optional(input, "max_results", 25);
  const resp = await ytGet(
    token,
    `/subscriptions?part=snippet&mine=true&maxResults=${maxResults}&order=alphabetical`,
  );
  const data = resp.json() as YtListResponse<YtSubscription>;

  if (!data.items || data.items.length === 0) {
    return successResult("No subscriptions found.", "No subscriptions found", [statusBlock("No subscriptions found.")]);
  }

  const lines = [`Subscriptions (${data.pageInfo?.totalResults ?? data.items.length} total):\n`];
  const rows: string[][] = [];
  data.items.forEach((sub, i) => {
    const channelId = sub.snippet.resourceId.channelId;
    lines.push(`${i + 1}. ${sub.snippet.title}`);
    lines.push(`   Channel ID: ${channelId} | ${channelUrl(channelId)}`);
    lines.push("");
    rows.push([
      String(i + 1),
      clipText(sub.snippet.title, 52),
      channelId,
      channelUrl(channelId),
    ]);
  });

  const count = data.items.length;
  return successResult(
    lines.join("\n").trim(),
    `${count} ${pluralize(count, "subscription")} found`,
    [
      statusBlock(`Loaded ${count} ${pluralize(count, "subscription")}.`),
      tableBlock(["#", "Channel", "Channel ID", "URL"], rows),
    ],
  );
}
