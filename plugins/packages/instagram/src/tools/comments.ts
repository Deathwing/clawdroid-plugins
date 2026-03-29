// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { igGet, igPost, GRAPH_BASE } from "../api";
import { required, optional } from "../params";
import type { IgComment, IgPagedResponse } from "../types";

export async function listComments(
  token: string,
  input: Record<string, unknown>,
): Promise<string> {
  const mediaId = required(input, "media_id");
  const limit = optional(input, "limit", 20);
  const resp = await igGet(
    token,
    `${GRAPH_BASE}/${mediaId}/comments?fields=id,text,username,timestamp,like_count&limit=${limit}`,
  );
  const obj: IgPagedResponse<IgComment> = resp.json();
  const comments = obj.data || [];
  if (!comments.length) return "No comments found.";
  const lines = [`Comments (${comments.length}):`];
  for (const c of comments) {
    const username = c.username || "?";
    const text = c.text || "";
    const ts = c.timestamp || "";
    const likes = c.like_count ?? 0;
    lines.push(`  [${ts}] @${username}: ${text} (❤ ${likes}) ID: ${c.id}`);
  }
  return lines.join("\n");
}

export async function replyComment(
  token: string,
  input: Record<string, unknown>,
): Promise<string> {
  const commentId = required(input, "comment_id");
  const message = required(input, "message");
  const resp = await igPost(token, `${GRAPH_BASE}/${commentId}/replies`, {
    message,
  });
  const obj: { id?: string } = resp.json();
  return `Reply posted. ID: ${obj.id || "?"}`;
}
