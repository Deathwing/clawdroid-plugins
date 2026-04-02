// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import type { ToolResult } from "../../../quickjs.d";
import { graphGet, graphPost } from "../api";
import { required } from "../params";
import { clipText, keyValueTable, pluralize, statusBlock, successResult, tableBlock, textBlock } from "../result";

export async function listTeams(token: string): Promise<ToolResult> {
  const obj = await graphGet(token, "/me/joinedTeams");
  const teams: any[] = obj.value || [];
  if (!teams.length) {
    return successResult("No teams found.", "0 teams found", [statusBlock("No joined Teams found.")]);
  }
  const lines = [`Joined Teams (${teams.length}):`];
  const rows = teams.map((t, index) => {
    const displayName = t.displayName || "(unnamed)";
    const id = t.id || "?";
    const desc = t.description || "";
    lines.push(`  ${displayName} - ${desc} (ID: ${id})`);
    return [String(index + 1), displayName, clipText(desc, 60) || "-", id];
  });

  return successResult(
    lines.join("\n"),
    `${teams.length} ${pluralize(teams.length, "team")} found`,
    [
      statusBlock(`Loaded ${teams.length} joined ${pluralize(teams.length, "team")}.`),
      tableBlock(["#", "Team", "Description", "ID"], rows),
    ],
  );
}

export async function listChannels(
  token: string,
  input: Record<string, unknown>,
): Promise<ToolResult> {
  const teamId = required(input, "team_id");
  const obj = await graphGet(token, `/teams/${teamId}/channels`);
  const channels: any[] = obj.value || [];
  if (!channels.length) {
    return successResult("No channels found.", "0 channels found", [statusBlock(`No channels found for team ${teamId}.`)]);
  }
  const lines = [`Channels (${channels.length}):`];
  const rows = channels.map((c, index) => {
    const displayName = c.displayName || "(unnamed)";
    const id = c.id || "?";
    lines.push(`  ${displayName} (ID: ${id})`);
    return [String(index + 1), displayName, id];
  });

  return successResult(
    lines.join("\n"),
    `${channels.length} ${pluralize(channels.length, "channel")} found`,
    [
      statusBlock(`Loaded ${channels.length} ${pluralize(channels.length, "channel")} for team ${teamId}.`),
      tableBlock(["#", "Channel", "ID"], rows),
    ],
  );
}

export async function sendTeamsMessage(
  token: string,
  input: Record<string, unknown>,
): Promise<ToolResult> {
  const teamId = required(input, "team_id");
  const channelId = required(input, "channel_id");
  const message = required(input, "message");
  const obj = await graphPost(
    token,
    `/teams/${teamId}/channels/${channelId}/messages`,
    { body: { content: message } },
  );
  const output = `Message sent. ID: ${obj.id || "?"}`;
  return successResult(output, "Message sent", [
    statusBlock(`Sent Teams message to ${teamId}/${channelId}.`),
    keyValueTable([
      ["Team ID", teamId],
      ["Channel ID", channelId],
      ["Message ID", obj.id || "?"],
    ]),
    textBlock(message),
  ]);
}
