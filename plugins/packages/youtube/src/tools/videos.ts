// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { ytGet, ytPost } from "../api";
import { required } from "../params";
import type { YtListResponse, YtVideo } from "../types";
import { clipText, formatCount, keyValueTable, statusBlock, successResult, textBlock } from "../result";
import { videoUrl } from "../urls";

function formatDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return iso;
  const h = match[1] ? `${match[1]}:` : "";
  const m = (match[2] || "0").padStart(h ? 2 : 1, "0");
  const s = (match[3] || "0").padStart(2, "0");
  return `${h}${m}:${s}`;
}

export async function getVideo(token: string, input: Record<string, unknown>) {
  const videoId = required(input, "video_id");
  const resp = await ytGet(token, `/videos?part=snippet,statistics,contentDetails&id=${videoId}`);
  const data = resp.json() as YtListResponse<YtVideo>;

  if (!data.items || data.items.length === 0) {
    return successResult(
      `No video found with ID: ${videoId}`,
      "Video not found",
      [statusBlock(`No video found with ID ${videoId}.`)],
    );
  }

  const video = data.items[0];
  const s = video.snippet;
  const stats = video.statistics;
  const duration = video.contentDetails ? formatDuration(video.contentDetails.duration) : "Unknown";

  const message = [
    `Title: ${s.title}`,
    `Channel: ${s.channelTitle} (${s.channelId})`,
    `Published: ${s.publishedAt?.slice(0, 10) ?? "Unknown"}`,
    `Duration: ${duration}`,
    `Views: ${formatCount(stats?.viewCount)}`,
    `Likes: ${stats?.likeCount !== undefined ? formatCount(stats.likeCount) : "Hidden"}`,
    `Comments: ${stats?.commentCount !== undefined ? formatCount(stats.commentCount) : "Disabled"}`,
    `URL: ${videoUrl(videoId)}`,
    `\nDescription:\n${s.description?.slice(0, 600) ?? ""}${(s.description?.length ?? 0) > 600 ? "..." : ""}`,
  ].join("\n");

  const blocks = [
    statusBlock(`Loaded video ${videoId}.`),
    keyValueTable([
      ["Title", s.title],
      ["Channel", `${s.channelTitle} (${s.channelId})`],
      ["Published", s.publishedAt?.slice(0, 10) ?? "Unknown"],
      ["Duration", duration],
      ["Views", formatCount(stats?.viewCount)],
      ["Likes", stats?.likeCount !== undefined ? formatCount(stats.likeCount) : "Hidden"],
      ["Comments", stats?.commentCount !== undefined ? formatCount(stats.commentCount) : "Disabled"],
      ["URL", videoUrl(videoId)],
    ]),
  ];
  const description = clipText(s.description, 600);
  if (description) {
    blocks.push(textBlock(description));
  }

  return successResult(message, `Video: ${clipText(s.title, 72)}`, blocks);
}

export async function rateVideo(token: string, input: Record<string, unknown>) {
  const videoId = required(input, "video_id");
  const rating = required(input, "rating");

  if (!["like", "dislike", "none"].includes(rating)) {
    throw new Error(`Invalid rating "${rating}". Must be "like", "dislike", or "none".`);
  }

  // rate endpoint uses query params, no JSON body
  await ytPost(token, `/videos/rate?id=${videoId}&rating=${rating}`);
  const action = rating === "none" ? "Removed rating from" : `${rating.charAt(0).toUpperCase() + rating.slice(1)}d`;
  const message = `${action} video ${videoId}.`;
  return successResult(message, message.replace(/\.$/, ""), [statusBlock(message)]);
}
