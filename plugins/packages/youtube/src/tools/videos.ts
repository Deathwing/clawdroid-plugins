// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { ytGet, ytPost } from "../api";
import { required } from "../params";
import type { YtListResponse, YtVideo } from "../types";

function formatDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return iso;
  const h = match[1] ? `${match[1]}:` : "";
  const m = (match[2] || "0").padStart(h ? 2 : 1, "0");
  const s = (match[3] || "0").padStart(2, "0");
  return `${h}${m}:${s}`;
}

export async function getVideo(token: string, input: Record<string, unknown>): Promise<string> {
  const videoId = required(input, "video_id");
  const resp = await ytGet(token, `/videos?part=snippet,statistics,contentDetails&id=${videoId}`);
  const data = resp.json() as YtListResponse<YtVideo>;

  if (!data.items || data.items.length === 0) return `No video found with ID: ${videoId}`;

  const video = data.items[0];
  const s = video.snippet;
  const stats = video.statistics;
  const duration = video.contentDetails ? formatDuration(video.contentDetails.duration) : "Unknown";

  return [
    `Title: ${s.title}`,
    `Channel: ${s.channelTitle} (${s.channelId})`,
    `Published: ${s.publishedAt?.slice(0, 10) ?? "Unknown"}`,
    `Duration: ${duration}`,
    `Views: ${Number(stats?.viewCount ?? 0).toLocaleString()}`,
    `Likes: ${stats?.likeCount !== undefined ? Number(stats.likeCount).toLocaleString() : "Hidden"}`,
    `Comments: ${stats?.commentCount !== undefined ? Number(stats.commentCount).toLocaleString() : "Disabled"}`,
    `URL: https://www.youtube.com/watch?v=${videoId}`,
    `\nDescription:\n${s.description?.slice(0, 600) ?? ""}${(s.description?.length ?? 0) > 600 ? "..." : ""}`,
  ].join("\n");
}

export async function rateVideo(token: string, input: Record<string, unknown>): Promise<string> {
  const videoId = required(input, "video_id");
  const rating = required(input, "rating");

  if (!["like", "dislike", "none"].includes(rating)) {
    throw new Error(`Invalid rating "${rating}". Must be "like", "dislike", or "none".`);
  }

  // rate endpoint uses query params, no JSON body
  await ytPost(token, `/videos/rate?id=${videoId}&rating=${rating}`);
  const action = rating === "none" ? "Removed rating from" : `${rating.charAt(0).toUpperCase() + rating.slice(1)}d`;
  return `${action} video ${videoId}.`;
}
