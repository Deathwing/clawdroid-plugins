// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { graphGet, graphPost } from "../api";
import { required } from "../params";

export async function listTeams(token: string): Promise<string> {
  const obj = await graphGet(token, "/me/joinedTeams");
  const teams: any[] = obj.value || [];
  if (!teams.length) return "No teams found.";
  const lines = [`Joined Teams (${teams.length}):`];
  for (const t of teams) {
    const displayName = t.displayName || "(unnamed)";
    const id = t.id || "?";
    const desc = t.description || "";
    lines.push(`  ${displayName} - ${desc} (ID: ${id})`);
  }
  return lines.join("\n");
}

export async function listChannels(
  token: string,
  input: Record<string, unknown>,
): Promise<string> {
  const teamId = required(input, "team_id");
  const obj = await graphGet(token, `/teams/${teamId}/channels`);
  const channels: any[] = obj.value || [];
  if (!channels.length) return "No channels found.";
  const lines = [`Channels (${channels.length}):`];
  for (const c of channels) {
    const displayName = c.displayName || "(unnamed)";
    const id = c.id || "?";
    lines.push(`  ${displayName} (ID: ${id})`);
  }
  return lines.join("\n");
}

export async function sendTeamsMessage(
  token: string,
  input: Record<string, unknown>,
): Promise<string> {
  const teamId = required(input, "team_id");
  const channelId = required(input, "channel_id");
  const message = required(input, "message");
  const obj = await graphPost(
    token,
    `/teams/${teamId}/channels/${channelId}/messages`,
    { body: { content: message } },
  );
  return `Message sent. ID: ${obj.id || "?"}`;
}
