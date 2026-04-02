// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import type { ToolResult } from "../../../quickjs.d";
import { telegramPost } from "../api";
import { failureResult, keyValueTable, statusBlock, successResult, textBlock } from "../result";

export async function getMe(token: string): Promise<ToolResult> {
  const resp = await telegramPost(token, "getMe");
  if (!resp.ok) return failureResult(`Error ${resp.status}: ${resp.text()}`, "Telegram request failed");
  const data = resp.json();
  const bot = data.result;
  const message = [
    `Bot: @${bot.username || "unknown"}`,
    `Name: ${bot.first_name || "?"}`,
    `ID: ${bot.id || "?"}`,
    `Can join groups: ${bot.can_join_groups ?? "?"}`,
  ].join("\n");
  return successResult(message, `Bot @${bot.username || "unknown"}`, [
    statusBlock(`Loaded Telegram bot profile for @${bot.username || "unknown"}.`),
    keyValueTable([
      ["Username", bot.username || "unknown"],
      ["Name", bot.first_name || "?"],
      ["ID", String(bot.id || "?")],
      ["Can join groups", String(bot.can_join_groups ?? "?")],
      ["Can read all group messages", String(bot.can_read_all_group_messages ?? "?")],
      ["Supports inline queries", String(bot.supports_inline_queries ?? "?")],
    ]),
  ]);
}

export async function getChat(token: string, chatId: string): Promise<ToolResult> {
  const resp = await telegramPost(token, "getChat", { chat_id: chatId });
  if (!resp.ok) return failureResult(`Error ${resp.status}: ${resp.text()}`, `Chat lookup failed for ${chatId}`);
  const data = resp.json();
  const chat = data.result || {};
  const title = chat.title || chat.username || chat.first_name || chatId;
  const message = [
    `Chat: ${title}`,
    `ID: ${chat.id || chatId}`,
    `Type: ${chat.type || "?"}`,
    `Username: ${chat.username || "(none)"}`,
  ].join("\n");
  const blocks = [
    statusBlock(`Loaded Telegram chat ${chat.id || chatId}.`),
    keyValueTable([
      ["Chat", title],
      ["ID", String(chat.id || chatId)],
      ["Type", chat.type || "?"],
      ["Username", chat.username || ""],
      ["Invite link", chat.invite_link || ""],
    ]),
  ];
  if (chat.description) {
    blocks.push(textBlock(chat.description));
  }
  return successResult(message, `Chat ${chat.id || chatId}`, blocks);
}

export async function getChatMemberCount(token: string, chatId: string): Promise<ToolResult> {
  const resp = await telegramPost(token, "getChatMemberCount", { chat_id: chatId });
  if (!resp.ok) return failureResult(`Error ${resp.status}: ${resp.text()}`, `Member count failed for ${chatId}`);
  const data = resp.json();
  const message = `Member count: ${data.result}`;
  return successResult(message, `Members in ${chatId}`, [
    statusBlock(`Loaded member count for ${chatId}.`),
    keyValueTable([
      ["Chat ID", chatId],
      ["Members", String(data.result)],
    ]),
  ]);
}
