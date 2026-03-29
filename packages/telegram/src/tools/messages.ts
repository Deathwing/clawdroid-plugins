// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { telegramPost } from "../api";

export async function sendMessage(
  token: string,
  chatId: string,
  text: string,
  parseMode?: string,
): Promise<string> {
  const params: Record<string, unknown> = { chat_id: chatId, text };
  if (parseMode) params.parse_mode = parseMode;
  const resp = await telegramPost(token, "sendMessage", params);
  if (!resp.ok) return `Error ${resp.status}: ${resp.text()}`;
  const data = resp.json();
  return JSON.stringify(data.result, null, 2);
}

export async function getUpdates(
  token: string,
  limit?: number,
  offset?: number,
): Promise<string> {
  const params: Record<string, unknown> = {};
  if (limit !== undefined) params.limit = limit;
  if (offset !== undefined) params.offset = offset;
  params.timeout = 1;
  const resp = await telegramPost(token, "getUpdates", params);
  if (!resp.ok) return `Error ${resp.status}: ${resp.text()}`;
  const data = resp.json();
  const updates: any[] = data.result || [];
  const summary = updates.map((u: any) => {
    const msg = u.message || u.edited_message || u.channel_post || {};
    return {
      update_id: u.update_id,
      chat_id: String(msg.chat?.id || ""),
      from: msg.from?.first_name || msg.from?.username || "unknown",
      text: msg.text || "",
      date: msg.date ? new Date(msg.date * 1000).toISOString() : "",
    };
  });
  return JSON.stringify(summary, null, 2);
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
): Promise<string> {
  const resp = await telegramPost(token, "forwardMessage", {
    chat_id: chatId,
    from_chat_id: fromChatId,
    message_id: Number(messageId),
  });
  if (!resp.ok) return `Error ${resp.status}: ${resp.text()}`;
  const data = resp.json();
  return JSON.stringify(data.result, null, 2);
}

export async function sendPhoto(
  token: string,
  chatId: string,
  photoUrl: string,
  caption?: string,
): Promise<string> {
  const params: Record<string, unknown> = { chat_id: chatId, photo: photoUrl };
  if (caption) params.caption = caption;
  const resp = await telegramPost(token, "sendPhoto", params);
  if (!resp.ok) return `Error ${resp.status}: ${resp.text()}`;
  const data = resp.json();
  return JSON.stringify(data.result, null, 2);
}
