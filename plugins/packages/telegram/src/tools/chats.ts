// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { telegramPost } from "../api";

export async function getMe(token: string): Promise<string> {
  const resp = await telegramPost(token, "getMe");
  if (!resp.ok) return `Error ${resp.status}: ${resp.text()}`;
  const data = resp.json();
  const bot = data.result;
  return JSON.stringify(bot, null, 2);
}

export async function getChat(token: string, chatId: string): Promise<string> {
  const resp = await telegramPost(token, "getChat", { chat_id: chatId });
  if (!resp.ok) return `Error ${resp.status}: ${resp.text()}`;
  const data = resp.json();
  return JSON.stringify(data.result, null, 2);
}

export async function getChatMemberCount(token: string, chatId: string): Promise<string> {
  const resp = await telegramPost(token, "getChatMemberCount", { chat_id: chatId });
  if (!resp.ok) return `Error ${resp.status}: ${resp.text()}`;
  const data = resp.json();
  return `Member count: ${data.result}`;
}
