// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { matrixGet, matrixPost } from "../api";

export async function listRooms(homeserver: string, token: string): Promise<string> {
  const resp = await matrixGet(homeserver, token, "/joined_rooms");
  if (!resp.ok) return `Error ${resp.status}: ${resp.text()}`;
  const data = resp.json();
  const roomIds: string[] = data.joined_rooms || [];
  return JSON.stringify(roomIds, null, 2);
}

export async function joinRoom(
  homeserver: string,
  token: string,
  roomIdOrAlias: string,
): Promise<string> {
  const encoded = encodeURIComponent(roomIdOrAlias);
  const resp = await matrixPost(homeserver, token, `/join/${encoded}`);
  if (!resp.ok) return `Error ${resp.status}: ${resp.text()}`;
  const data = resp.json();
  return `Joined room: ${data.room_id || roomIdOrAlias}`;
}

export async function getRoomInfo(
  homeserver: string,
  token: string,
  roomId: string,
): Promise<string> {
  const encoded = encodeURIComponent(roomId);
  const resp = await matrixGet(homeserver, token, `/rooms/${encoded}/state/m.room.name`);
  if (!resp.ok) {
    // Room name state event might not exist, try topic
    const topicResp = await matrixGet(homeserver, token, `/rooms/${encoded}/state/m.room.topic`);
    if (!topicResp.ok) return `Room ${roomId} (no name or topic set)`;
    const topicData = topicResp.json();
    return JSON.stringify({ room_id: roomId, topic: topicData.topic || "" }, null, 2);
  }
  const data = resp.json();

  // Also try to get topic
  const topicResp = await matrixGet(homeserver, token, `/rooms/${encoded}/state/m.room.topic`);
  const topic = topicResp.ok ? topicResp.json().topic || "" : "";

  return JSON.stringify({
    room_id: roomId,
    name: data.name || "",
    topic,
  }, null, 2);
}
