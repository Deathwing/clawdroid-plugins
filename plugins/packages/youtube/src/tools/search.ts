// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { ytGet } from "../api";
import { required, optional } from "../params";
import type { YtSearchListResponse } from "../types";
import { clipText, pluralize, statusBlock, successResult, tableBlock } from "../result";
import { channelUrl, playlistUrl, videoUrl } from "../urls";

function itemKind(item: YtSearchListResponse["items"][number]): string {
  if (item.id.videoId) return "video";
  if (item.id.channelId) return "channel";
  if (item.id.playlistId) return "playlist";
  return "item";
}

function itemId(item: YtSearchListResponse["items"][number]): string {
  return item.id.videoId || item.id.channelId || item.id.playlistId || "";
}

export async function search(token: string, input: Record<string, unknown>) {
  const query = required(input, "query");
  const type = optional(input, "type", "video");
  const maxResults = optional(input, "max_results", 10);
  const order = optional(input, "order", "relevance");

  const encoded = encodeURIComponent(query);
  const resp = await ytGet(
    token,
    `/search?part=snippet&q=${encoded}&type=${type}&maxResults=${maxResults}&order=${order}`,
  );
  const data = resp.json() as YtSearchListResponse;

  if (!data.items || data.items.length === 0) {
    return successResult(
      "No results found.",
      "No results found",
      [statusBlock(`No ${type} results found for "${query}".`)],
    );
  }

  const lines: string[] = [
    `Search results for "${query}"${data.pageInfo ? ` (${data.pageInfo.totalResults}+ total)` : ""}:\n`,
  ];
  const rows: string[][] = [];

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    const snippet = item.snippet;
    const videoId = item.id.videoId;
    const channelId = item.id.channelId;
    const playlistId = item.id.playlistId;
    const publishedAt = snippet.publishedAt ? snippet.publishedAt.slice(0, 10) : "";

    lines.push(`${i + 1}. ${snippet.title}`);
    lines.push(`   Channel: ${snippet.channelTitle}${publishedAt ? ` | Published: ${publishedAt}` : ""}`);

    if (videoId) {
      lines.push(`   ID: ${videoId} | ${videoUrl(videoId)}`);
    } else if (channelId) {
      lines.push(`   Channel ID: ${channelId} | ${channelUrl(channelId)}`);
    } else if (playlistId) {
      lines.push(`   Playlist ID: ${playlistId} | ${playlistUrl(playlistId)}`);
    }

    if (snippet.description) {
      const desc = snippet.description.slice(0, 120);
      lines.push(`   ${desc}${snippet.description.length > 120 ? "..." : ""}`);
    }
    lines.push("");

    rows.push([
      String(i + 1),
      itemKind(item),
      clipText(snippet.title, 60),
      clipText(snippet.channelTitle, 32),
      publishedAt || "-",
      itemId(item) || "-",
    ]);
  }

  const count = data.items.length;
  const summary = `${count} ${type} result${count === 1 ? "" : "s"} for "${query}"`;
  return successResult(
    lines.join("\n").trim(),
    summary,
    [
      statusBlock(`Found ${count} ${pluralize(count, type)} for "${query}".`),
      tableBlock(["#", "Kind", "Title", "Channel", "Published", "ID"], rows),
    ],
  );
}
