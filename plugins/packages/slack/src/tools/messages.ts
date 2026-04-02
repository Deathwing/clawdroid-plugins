// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { slackPost, slackGet } from "../api";
import type { ToolResult } from "../../../quickjs.d";
import { clipText, failureResult, formatSlackTimestamp, keyValueTable, pluralize, statusBlock, successResult, tableBlock, textBlock } from "../result";

export async function sendMessage(
  token: string,
  channel: string,
  text: string,
  threadTs?: string,
): Promise<ToolResult> {
  const body: Record<string, unknown> = { channel, text };
  if (threadTs) body.thread_ts = threadTs;
  const resp = await slackPost(token, "chat.postMessage", body);
  if (!resp.ok) return failureResult(`Error ${resp.status}: ${resp.text()}`, `Send failed for ${channel}`);
  const data = resp.json();
  if (!data.ok) return failureResult(`Slack API error: ${data.error}`, `Send failed for ${channel}`);
  const message = `Message sent (ts: ${data.ts})`;
  return successResult(message, "Message sent", [
    statusBlock(`Sent Slack message to ${channel}.`),
    keyValueTable([
      ["Channel", channel],
      ["Timestamp", data.ts || "?"],
      ["Thread", threadTs || ""],
    ]),
    textBlock(text),
  ]);
}

export async function searchMessages(
  token: string,
  query: string,
  limit?: number,
): Promise<ToolResult> {
  const params: Record<string, string> = { query };
  if (limit) params.count = String(limit);
  const resp = await slackGet(token, "search.messages", params);
  if (!resp.ok) return failureResult(`Error ${resp.status}: ${resp.text()}`, "Slack request failed");
  const data = resp.json();
  if (!data.ok) return failureResult(`Slack API error: ${data.error}`, "Slack request failed");
  const matches = (data.messages?.matches || []).map((m: any) => ({
    channel: m.channel?.name || "",
    user: m.username || "",
    text: m.text || "",
    ts: m.ts,
    permalink: m.permalink || "",
  }));
  if (!matches.length) {
    return successResult("No matches found.", "0 matches found", [statusBlock(`No Slack message matches found for "${query}".`)]);
  }

  const message = [
    `Slack message search results (${matches.length}):`,
    "",
    ...matches.flatMap((match: any, index: number) => [
      `${index + 1}. #${match.channel || "unknown"} ${match.user ? `by ${match.user}` : ""}`.trim(),
      `   [${formatSlackTimestamp(match.ts)}] ${match.text || "(no text)"}`,
      ...(match.permalink ? [`   ${match.permalink}`] : []),
      "",
    ]),
  ].join("\n").trim();

  return successResult(
    message,
    `${matches.length} ${pluralize(matches.length, "match")} found`,
    [
      statusBlock(`Found ${matches.length} Slack ${pluralize(matches.length, "match")} for "${query}".`),
      tableBlock(
        ["#", "Channel", "User", "Time", "Text"],
        matches.map((match: any, index: number) => [
          String(index + 1),
          match.channel || "-",
          match.user || "-",
          formatSlackTimestamp(match.ts),
          clipText(match.text, 80) || "-",
        ]),
      ),
    ],
  );
}

export async function addReaction(
  token: string,
  channel: string,
  timestamp: string,
  emoji: string,
): Promise<ToolResult> {
  const resp = await slackPost(token, "reactions.add", {
    channel,
    timestamp,
    name: emoji,
  });
  if (!resp.ok) return failureResult(`Error ${resp.status}: ${resp.text()}`, `Reaction failed for ${channel}`);
  const data = resp.json();
  if (!data.ok) return failureResult(`Slack API error: ${data.error}`, `Reaction failed for ${channel}`);
  const message = `Reaction :${emoji}: added`;
  return successResult(message, "Reaction added", [
    statusBlock(`Added :${emoji}: reaction in ${channel}.`),
    keyValueTable([
      ["Channel", channel],
      ["Timestamp", timestamp],
      ["Emoji", emoji],
    ]),
  ]);
}
