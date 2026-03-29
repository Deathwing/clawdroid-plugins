// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { igGet, igPost, getUserId, GRAPH_BASE } from "../api";
import { required, optional } from "../params";
import type { IgMediaItem, IgPagedResponse } from "../types";

export async function listMedia(
  token: string,
  input: Record<string, unknown>,
): Promise<string> {
  const limit = optional(input, "limit", 10);
  const userId = await getUserId(token);
  const resp = await igGet(
    token,
    `${GRAPH_BASE}/${userId}/media?fields=id,caption,media_type,timestamp,permalink,like_count,comments_count&limit=${limit}`,
  );
  const obj: IgPagedResponse<IgMediaItem> = resp.json();
  const media = obj.data || [];
  if (!media.length) return "No media found.";
  const lines = [`Recent Posts (${media.length}):`];
  for (const m of media) {
    const type = m.media_type || "?";
    const ts = m.timestamp || "";
    const caption = (m.caption || "(no caption)").substring(0, 80);
    const likes = m.like_count ?? 0;
    const comments = m.comments_count ?? 0;
    lines.push(`  [${ts}] ${type} - ${caption}... (❤ ${likes} 💬 ${comments}) ID: ${m.id}`);
  }
  return lines.join("\n");
}

export async function getMedia(
  token: string,
  input: Record<string, unknown>,
): Promise<string> {
  const mediaId = required(input, "media_id");
  const resp = await igGet(
    token,
    `${GRAPH_BASE}/${mediaId}?fields=id,caption,media_type,media_url,timestamp,permalink,like_count,comments_count`,
  );
  const m: IgMediaItem = resp.json();
  return [
    `Media: ${m.media_type || "?"}`,
    `Caption: ${m.caption || "(none)"}`,
    `Posted: ${m.timestamp || "?"}`,
    `Likes: ${m.like_count ?? 0}`,
    `Comments: ${m.comments_count ?? 0}`,
    `URL: ${m.permalink || "?"}`,
    `ID: ${mediaId}`,
  ].join("\n");
}

export async function createMedia(
  token: string,
  input: Record<string, unknown>,
): Promise<string> {
  const userId = await getUserId(token);
  const imageUrl = optional<string | null>(input, "image_url", null);
  const videoUrl = optional<string | null>(input, "video_url", null);
  const caption = optional<string | null>(input, "caption", null);
  const isReel = optional<string>(input, "is_reel", "false") === "true";

  const params: Record<string, string> = {};
  if (videoUrl) {
    params.video_url = videoUrl;
    params.media_type = isReel ? "REELS" : "VIDEO";
  } else if (imageUrl) {
    params.image_url = imageUrl;
  } else {
    throw new Error("Provide either 'image_url' or 'video_url'.");
  }
  if (caption) params.caption = caption;

  const resp = await igPost(token, `${GRAPH_BASE}/${userId}/media`, params);
  const obj: { id?: string } = resp.json();
  if (!obj.id) throw new Error("Failed to create media container.");
  return `Media container created. ID: ${obj.id}\nUse instagram_publish_media with this creation_id to publish.`;
}

export async function publishMedia(
  token: string,
  input: Record<string, unknown>,
): Promise<string> {
  const creationId = required(input, "creation_id");
  const userId = await getUserId(token);
  const resp = await igPost(token, `${GRAPH_BASE}/${userId}/media_publish`, {
    creation_id: creationId,
  });
  const obj: { id?: string } = resp.json();
  return `Media published! Media ID: ${obj.id || "?"}`;
}
