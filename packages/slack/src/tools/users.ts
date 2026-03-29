// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { slackGet } from "../api";

export async function listUsers(token: string, limit?: number): Promise<string> {
  const params: Record<string, string> = {};
  if (limit) params.limit = String(limit);
  const resp = await slackGet(token, "users.list", params);
  if (!resp.ok) return `Error ${resp.status}: ${resp.text()}`;
  const data = resp.json();
  if (!data.ok) return `Slack API error: ${data.error}`;
  const users = (data.members || []).map((u: any) => ({
    id: u.id,
    name: u.name,
    real_name: u.real_name || "",
    is_bot: u.is_bot,
    status: u.profile?.status_text || "",
  }));
  return JSON.stringify(users, null, 2);
}

export async function getUser(token: string, userId: string): Promise<string> {
  const resp = await slackGet(token, "users.info", { user: userId });
  if (!resp.ok) return `Error ${resp.status}: ${resp.text()}`;
  const data = resp.json();
  if (!data.ok) return `Slack API error: ${data.error}`;
  const u = data.user;
  return JSON.stringify({
    id: u.id,
    name: u.name,
    real_name: u.real_name || "",
    email: u.profile?.email || "",
    title: u.profile?.title || "",
    status: u.profile?.status_text || "",
    is_bot: u.is_bot,
    is_admin: u.is_admin,
  }, null, 2);
}
