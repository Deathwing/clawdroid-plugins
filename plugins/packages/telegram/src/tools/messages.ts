// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import type { ToolResult } from "../../../quickjs.d";
import { telegramPost } from "../api";
import { clipText, failureResult, keyValueTable, pluralize, statusBlock, successResult, tableBlock, textBlock } from "../result";

export async function sendMessage(
  token: string,
  chatId: string,
  text: string,
  parseMode?: string,
): Promise<ToolResult> {
  const params: Record<string, unknown> = { chat_id: chatId, text };
  if (parseMode) params.parse_mode = parseMode;
  const resp = await telegramPost(token, "sendMessage", params);
  if (!resp.ok) return failureResult(`Error ${resp.status}: ${resp.text()}`, `Send failed for ${chatId}`);
  const data = resp.json();
  const result = data.result || {};
  const message = [
    `Sent message to chat ${chatId}.`,
    `Message ID: ${result.message_id || "?"}`,
    `Text: ${result.text || text}`,
  ].join("\n");
  return successResult(message, "Message sent", [
    statusBlock(`Sent Telegram message to ${chatId}.`),
    keyValueTable([
      ["Chat ID", chatId],
      ["Message ID", String(result.message_id || "?")],
      ["Parse mode", parseMode || ""],
    ]),
    textBlock(result.text || text),
  ]);
}

export async function getUpdates(
  token: string,
  limit?: number,
  offset?: number,
): Promise<ToolResult> {
  const params: Record<string, unknown> = {};
  if (limit !== undefined) params.limit = limit;
  if (offset !== undefined) params.offset = offset;
  params.timeout = 1;
  const resp = await telegramPost(token, "getUpdates", params);
  if (!resp.ok) return failureResult(`Error ${resp.status}: ${resp.text()}`, "Telegram request failed");
  const data = resp.json();
  const updates: any[] = data.result || [];
  if (!updates.length) {
    return successResult("No updates found.", "0 updates found", [statusBlock("No Telegram updates found.")]);
  }

  const normalized = updates.map((update: any) => {
    const msg = update.message || update.edited_message || update.channel_post || {};
    return {
      update_id: update.update_id,
      chat_id: String(msg.chat?.id || ""),
      from: msg.from?.first_name || msg.from?.username || "unknown",
      text: msg.text || msg.caption || "",
      date: msg.date ? new Date(msg.date * 1000).toISOString() : "",
    };
  });

  const message = [
    `Telegram updates (${normalized.length}):`,
    "",
    ...normalized.flatMap((update, index) => [
      `${index + 1}. [${update.date || "?"}] ${update.from} in ${update.chat_id}`,
      `   ${update.text || "(no text)"}`,
      `   Update ID: ${update.update_id}`,
      "",
    ]),
  ].join("\n").trim();

  return successResult(
    message,
    `${normalized.length} ${pluralize(normalized.length, "update")} found`,
    [
      statusBlock(`Loaded ${normalized.length} Telegram ${pluralize(normalized.length, "update")}.`),
      tableBlock(
        ["#", "Chat", "From", "Date", "Text"],
        normalized.map((update, index) => [
          String(index + 1),
          update.chat_id,
          update.from,
          update.date || "-",
          clipText(update.text, 80) || "-",
        ]),
      ),
    ],
  );
}

export async function getUpdatesRaw(
  token: string,
  limit: number,
  offset?: number,
): Promise<any[]> {
  const params: Record<string, unknown> = { limit, timeout: 1 };
  if (offset !== undefined) params.offset = offset;
  const resp = await telegramPost(token, "getUpdates", params);
  if (!resp.ok) return [];
  const data = resp.json();
  return data.result || [];
}

export async function forwardMessage(
  token: string,
  chatId: string,
  fromChatId: string,
  messageId: string,
): Promise<ToolResult> {
  const resp = await telegramPost(token, "forwardMessage", {
    chat_id: chatId,
    from_chat_id: fromChatId,
    message_id: Number(messageId),
  });
  if (!resp.ok) return failureResult(`Error ${resp.status}: ${resp.text()}`, `Forward failed for ${chatId}`);
  const data = resp.json();
  const result = data.result || {};
  const message = [
    `Forwarded message ${messageId} from ${fromChatId} to ${chatId}.`,
    `New Message ID: ${result.message_id || "?"}`,
  ].join("\n");
  return successResult(message, "Message forwarded", [
    statusBlock(`Forwarded Telegram message to ${chatId}.`),
    keyValueTable([
      ["Destination chat", chatId],
      ["Source chat", fromChatId],
      ["Source message", messageId],
      ["New message ID", String(result.message_id || "?")],
    ]),
  ]);
}

export async function sendPhoto(
  token: string,
  chatId: string,
  photoUrl: string,
  caption?: string,
): Promise<ToolResult> {
  const params: Record<string, unknown> = { chat_id: chatId, photo: photoUrl };
  if (caption) params.caption = caption;
  const resp = await telegramPost(token, "sendPhoto", params);
  if (!resp.ok) return failureResult(`Error ${resp.status}: ${resp.text()}`, `Photo send failed for ${chatId}`);
  const data = resp.json();
  const result = data.result || {};
  const message = [
    `Sent photo to chat ${chatId}.`,
    `Message ID: ${result.message_id || "?"}`,
    `Photo URL: ${photoUrl}`,
    ...(caption ? [`Caption: ${caption}`] : []),
  ].join("\n");
  const blocks = [
    statusBlock(`Sent Telegram photo to ${chatId}.`),
    keyValueTable([
      ["Chat ID", chatId],
      ["Message ID", String(result.message_id || "?")],
      ["Photo URL", photoUrl],
    ]),
  ];
  if (caption) {
    blocks.push(textBlock(caption));
  }
  return successResult(message, "Photo sent", blocks);
}
