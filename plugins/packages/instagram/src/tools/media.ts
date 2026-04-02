// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import type { ToolResult } from "../../../quickjs.d";
import { igGet, igPost, getUserId, GRAPH_BASE } from "../api";
import { required, optional } from "../params";
import { clipText, formatCount, formatDate, keyValueTable, pluralize, statusBlock, successResult, tableBlock, textBlock } from "../result";
import type { IgMediaItem, IgPagedResponse } from "../types";

export async function listMedia(
  token: string,
  input: Record<string, unknown>,
): Promise<ToolResult> {
  const limit = optional(input, "limit", 10);
  const userId = await getUserId(token);
  const resp = await igGet(
    token,
    `${GRAPH_BASE}/${userId}/media?fields=id,caption,media_type,timestamp,permalink,like_count,comments_count&limit=${limit}`,
  );
  const obj: IgPagedResponse<IgMediaItem> = resp.json();
  const media = obj.data || [];
  if (!media.length) {
    return successResult(
      "No media found.",
      "0 posts found",
      [statusBlock("No Instagram posts found.")],
    );
  }
  const lines = [`Recent Posts (${media.length}):`];
  const rows = media.map((m) => {
    const type = m.media_type || "?";
    const ts = m.timestamp || "";
    const caption = clipText(m.caption || "(no caption)", 80);
    const likes = m.like_count ?? 0;
    const comments = m.comments_count ?? 0;
    lines.push(`  [${ts}] ${type} - ${caption} (❤ ${likes} 💬 ${comments}) ID: ${m.id}`);
    return [
      type,
      formatDate(ts),
      formatCount(likes),
      formatCount(comments),
      caption,
      m.id,
    ];
  });

  return successResult(
    lines.join("\n"),
    `${media.length} ${pluralize(media.length, "post")} found`,
    [
      statusBlock(`Found ${media.length} recent ${pluralize(media.length, "post")}.`),
      tableBlock(["Type", "Posted", "Likes", "Comments", "Caption", "ID"], rows),
    ],
  );
}

export async function getMedia(
  token: string,
  input: Record<string, unknown>,
): Promise<ToolResult> {
  const mediaId = required(input, "media_id");
  const resp = await igGet(
    token,
    `${GRAPH_BASE}/${mediaId}?fields=id,caption,media_type,media_url,timestamp,permalink,like_count,comments_count`,
  );
  const m: IgMediaItem = resp.json();
  const message = [
    `Media: ${m.media_type || "?"}`,
    `Caption: ${m.caption || "(none)"}`,
    `Posted: ${m.timestamp || "?"}`,
    `Likes: ${m.like_count ?? 0}`,
    `Comments: ${m.comments_count ?? 0}`,
    `URL: ${m.permalink || "?"}`,
    `ID: ${mediaId}`,
  ].join("\n");

  const blocks = [
    statusBlock(`Loaded Instagram media ${mediaId}.`),
    keyValueTable([
      ["Type", m.media_type || "?"],
      ["Posted", formatDate(m.timestamp)],
      ["Likes", formatCount(m.like_count)],
      ["Comments", formatCount(m.comments_count)],
      ["URL", m.permalink || ""],
      ["ID", mediaId],
    ]),
  ];
  if (m.caption) {
    blocks.push(textBlock(m.caption));
  }

  return successResult(message, `Post ${mediaId}`, blocks);
}

export async function createMedia(
  token: string,
  input: Record<string, unknown>,
): Promise<ToolResult> {
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
  const kind = videoUrl ? (isReel ? "reel" : "video") : "image";
  const message = `Media container created. ID: ${obj.id}\nUse instagram_publish_media with this creation_id to publish.`;
  const blocks = [
    statusBlock(`Created Instagram ${kind} container ${obj.id}.`),
    keyValueTable([
      ["Creation ID", obj.id],
      ["Type", kind],
      ["User ID", userId],
    ]),
  ];
  if (caption) {
    blocks.push(textBlock(caption));
  }

  return successResult(message, "Media container created", blocks);
}

export async function publishMedia(
  token: string,
  input: Record<string, unknown>,
): Promise<ToolResult> {
  const creationId = required(input, "creation_id");
  const userId = await getUserId(token);
  const resp = await igPost(token, `${GRAPH_BASE}/${userId}/media_publish`, {
    creation_id: creationId,
  });
  const obj: { id?: string } = resp.json();
  const message = `Media published! Media ID: ${obj.id || "?"}`;
  return successResult(message, "Media published", [
    statusBlock(`Published Instagram media ${obj.id || "?"}.`),
    keyValueTable([
      ["Creation ID", creationId],
      ["Media ID", obj.id || "?"],
      ["User ID", userId],
    ]),
  ]);
}
