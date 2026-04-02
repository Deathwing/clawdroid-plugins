// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import type { ToolResult } from "../../../quickjs.d";
import { matrixGet, matrixPost } from "../api";
import { failureResult, keyValueTable, pluralize, statusBlock, successResult, tableBlock } from "../result";

export async function listRooms(homeserver: string, token: string): Promise<ToolResult> {
  const resp = await matrixGet(homeserver, token, "/joined_rooms");
  if (!resp.ok) {
    return failureResult(`Error ${resp.status}: ${resp.text()}`, "Matrix request failed");
  }
  const data = resp.json();
  const roomIds: string[] = data.joined_rooms || [];
  if (!roomIds.length) {
    return successResult("No rooms found.", "0 rooms found", [statusBlock("No joined rooms found.")]);
  }

  const message = [
    `Joined rooms (${roomIds.length}):`,
    ...roomIds.map((roomId, index) => `${index + 1}. ${roomId}`),
  ].join("\n");

  return successResult(
    message,
    `${roomIds.length} ${pluralize(roomIds.length, "room")} found`,
    [
      statusBlock(`Found ${roomIds.length} joined ${pluralize(roomIds.length, "room")}.`),
      tableBlock(["#", "Room ID"], roomIds.map((roomId, index) => [String(index + 1), roomId])),
    ],
  );
}

export async function joinRoom(
  homeserver: string,
  token: string,
  roomIdOrAlias: string,
): Promise<ToolResult> {
  const encoded = encodeURIComponent(roomIdOrAlias);
  const resp = await matrixPost(homeserver, token, `/join/${encoded}`);
  if (!resp.ok) {
    return failureResult(`Error ${resp.status}: ${resp.text()}`, `Join failed for ${roomIdOrAlias}`);
  }
  const data = resp.json();
  const roomId = data.room_id || roomIdOrAlias;
  const message = `Joined room: ${roomId}`;
  return successResult(message, `Joined ${roomId}`, [
    statusBlock(message),
    keyValueTable([
      ["Room", roomId],
      ["Homeserver", homeserver],
    ]),
  ]);
}

export async function getRoomInfo(
  homeserver: string,
  token: string,
  roomId: string,
): Promise<ToolResult> {
  const encoded = encodeURIComponent(roomId);
  const resp = await matrixGet(homeserver, token, `/rooms/${encoded}/state/m.room.name`);
  if (!resp.ok) {
    // Room name state event might not exist, try topic
    const topicResp = await matrixGet(homeserver, token, `/rooms/${encoded}/state/m.room.topic`);
    if (!topicResp.ok) {
      const message = `Room ${roomId} (no name or topic set)`;
      return successResult(message, `Room ${roomId}`, [
        statusBlock(message),
        keyValueTable([
          ["Room ID", roomId],
          ["Homeserver", homeserver],
        ]),
      ]);
    }
    const topicData = topicResp.json();
    const topic = topicData.topic || "";
    const message = [`Room: ${roomId}`, `Topic: ${topic || "(none)"}`].join("\n");
    return successResult(message, `Room ${roomId}`, [
      statusBlock(`Loaded room info for ${roomId}.`),
      keyValueTable([
        ["Room ID", roomId],
        ["Topic", topic || "(none)"],
      ]),
    ]);
  }
  const data = resp.json();

  // Also try to get topic
  const topicResp = await matrixGet(homeserver, token, `/rooms/${encoded}/state/m.room.topic`);
  const topic = topicResp.ok ? topicResp.json().topic || "" : "";

  const name = data.name || "";
  const message = [
    `Room: ${roomId}`,
    `Name: ${name || "(none)"}`,
    `Topic: ${topic || "(none)"}`,
  ].join("\n");
  return successResult(message, `Room ${roomId}`, [
    statusBlock(`Loaded room info for ${roomId}.`),
    keyValueTable([
      ["Room ID", roomId],
      ["Name", name || "(none)"],
      ["Topic", topic || "(none)"],
    ]),
  ]);
}
