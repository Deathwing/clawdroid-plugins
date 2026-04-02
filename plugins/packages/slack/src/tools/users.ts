// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { slackGet } from "../api";
import type { ToolResult } from "../../../quickjs.d";
import { failureResult, keyValueTable, pluralize, statusBlock, successResult, tableBlock } from "../result";

export async function listUsers(token: string, limit?: number): Promise<ToolResult> {
  const params: Record<string, string> = {};
  if (limit) params.limit = String(limit);
  const resp = await slackGet(token, "users.list", params);
  if (!resp.ok) return failureResult(`Error ${resp.status}: ${resp.text()}`, "Slack request failed");
  const data = resp.json();
  if (!data.ok) return failureResult(`Slack API error: ${data.error}`, "Slack request failed");
  const users = (data.members || []).map((u: any) => ({
    id: u.id,
    name: u.name,
    real_name: u.real_name || "",
    is_bot: u.is_bot,
    status: u.profile?.status_text || "",
  }));
  if (!users.length) {
    return successResult("No users found.", "0 users found", [statusBlock("No Slack users found.")]);
  }

  const message = [
    `Slack users (${users.length}):`,
    "",
    ...users.flatMap((user: any, index: number) => [
      `${index + 1}. ${user.name}${user.real_name ? ` (${user.real_name})` : ""}${user.is_bot ? " [bot]" : ""}`,
      `   ID: ${user.id}`,
      ...(user.status ? [`   Status: ${user.status}`] : []),
      "",
    ]),
  ].join("\n").trim();

  return successResult(
    message,
    `${users.length} ${pluralize(users.length, "user")} found`,
    [
      statusBlock(`Loaded ${users.length} Slack ${pluralize(users.length, "user")}.`),
      tableBlock(
        ["#", "Username", "Name", "Bot", "Status", "ID"],
        users.map((user: any, index: number) => [
          String(index + 1),
          user.name,
          user.real_name || "-",
          user.is_bot ? "Yes" : "No",
          user.status || "-",
          user.id,
        ]),
      ),
    ],
  );
}

export async function getUser(token: string, userId: string): Promise<ToolResult> {
  const resp = await slackGet(token, "users.info", { user: userId });
  if (!resp.ok) return failureResult(`Error ${resp.status}: ${resp.text()}`, `User lookup failed for ${userId}`);
  const data = resp.json();
  if (!data.ok) return failureResult(`Slack API error: ${data.error}`, `User lookup failed for ${userId}`);
  const u = data.user;
  const message = [
    `User: ${u.name || userId}`,
    `Name: ${u.real_name || "(none)"}`,
    `Email: ${u.profile?.email || "(none)"}`,
    `Title: ${u.profile?.title || "(none)"}`,
    `Status: ${u.profile?.status_text || "(none)"}`,
    `Bot: ${u.is_bot ? "yes" : "no"}`,
    `Admin: ${u.is_admin ? "yes" : "no"}`,
  ].join("\n");
  return successResult(message, `User ${u.name || userId}`, [
    statusBlock(`Loaded Slack user ${u.name || userId}.`),
    keyValueTable([
      ["User", u.name || userId],
      ["Name", u.real_name || "(none)"],
      ["Email", u.profile?.email || ""],
      ["Title", u.profile?.title || ""],
      ["Status", u.profile?.status_text || ""],
      ["Bot", u.is_bot ? "Yes" : "No"],
      ["Admin", u.is_admin ? "Yes" : "No"],
      ["ID", u.id || userId],
    ]),
  ]);
}
