// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import type { ToolResult } from "../../../quickjs.d";
import { igGet, igPost, GRAPH_BASE } from "../api";
import { required, optional } from "../params";
import { clipText, formatCount, formatDate, keyValueTable, pluralize, statusBlock, successResult, tableBlock, textBlock } from "../result";
import type { IgComment, IgPagedResponse } from "../types";

export async function listComments(
  token: string,
  input: Record<string, unknown>,
): Promise<ToolResult> {
  const mediaId = required(input, "media_id");
  const limit = optional(input, "limit", 20);
  const resp = await igGet(
    token,
    `${GRAPH_BASE}/${mediaId}/comments?fields=id,text,username,timestamp,like_count&limit=${limit}`,
  );
  const obj: IgPagedResponse<IgComment> = resp.json();
  const comments = obj.data || [];
  if (!comments.length) {
    return successResult(
      "No comments found.",
      "0 comments found",
      [statusBlock(`No comments found for media ${mediaId}.`)],
    );
  }
  const lines = [`Comments (${comments.length}):`];
  const rows = comments.map((c) => {
    const username = c.username || "?";
    const text = c.text || "";
    const ts = c.timestamp || "";
    const likes = c.like_count ?? 0;
    lines.push(`  [${ts}] @${username}: ${text} (❤ ${likes}) ID: ${c.id}`);
    return [
      `@${username}`,
      formatDate(ts),
      formatCount(likes),
      clipText(text, 80) || "-",
      c.id,
    ];
  });

  return successResult(
    lines.join("\n"),
    `${comments.length} ${pluralize(comments.length, "comment")} found`,
    [
      statusBlock(`Found ${comments.length} ${pluralize(comments.length, "comment")} for media ${mediaId}.`),
      tableBlock(["User", "Date", "Likes", "Text", "ID"], rows),
    ],
  );
}

export async function replyComment(
  token: string,
  input: Record<string, unknown>,
): Promise<ToolResult> {
  const commentId = required(input, "comment_id");
  const message = required(input, "message");
  const resp = await igPost(token, `${GRAPH_BASE}/${commentId}/replies`, {
    message,
  });
  const obj: { id?: string } = resp.json();
  const output = `Reply posted. ID: ${obj.id || "?"}`;
  return successResult(output, "Reply posted", [
    statusBlock(`Posted reply to comment ${commentId}.`),
    keyValueTable([
      ["Comment ID", commentId],
      ["Reply ID", obj.id || "?"],
    ]),
    textBlock(message),
  ]);
}
