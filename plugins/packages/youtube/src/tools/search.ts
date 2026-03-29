// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { ytGet } from "../api";
import { required, optional } from "../params";
import type { YtSearchListResponse } from "../types";

export async function search(token: string, input: Record<string, unknown>): Promise<string> {
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

  if (!data.items || data.items.length === 0) return "No results found.";

  const lines: string[] = [
    `Search results for "${query}"${data.pageInfo ? ` (${data.pageInfo.totalResults}+ total)` : ""}:\n`,
  ];

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
      lines.push(`   ID: ${videoId} | https://www.youtube.com/watch?v=${videoId}`);
    } else if (channelId) {
      lines.push(`   Channel ID: ${channelId} | https://www.youtube.com/channel/${channelId}`);
    } else if (playlistId) {
      lines.push(`   Playlist ID: ${playlistId} | https://www.youtube.com/playlist?list=${playlistId}`);
    }

    if (snippet.description) {
      const desc = snippet.description.slice(0, 120);
      lines.push(`   ${desc}${snippet.description.length > 120 ? "..." : ""}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}
