// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { matrixGet, matrixPut } from "../api";

export async function sendMessage(
  homeserver: string,
  token: string,
  roomId: string,
  text: string,
): Promise<string> {
  const txnId = `m${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const encodedRoom = encodeURIComponent(roomId);
  const resp = await matrixPut(
    homeserver,
    token,
    `/rooms/${encodedRoom}/send/m.room.message/${txnId}`,
    { msgtype: "m.text", body: text },
  );
  if (!resp.ok) return `Error ${resp.status}: ${resp.text()}`;
  const data = resp.json();
  return `Message sent (event: ${data.event_id || "unknown"})`;
}

export async function readRoom(
  homeserver: string,
  token: string,
  roomId: string,
  limit?: number,
): Promise<string> {
  const encodedRoom = encodeURIComponent(roomId);
  const l = limit || 20;
  const resp = await matrixGet(homeserver, token, `/rooms/${encodedRoom}/messages?dir=b&limit=${l}`);
  if (!resp.ok) return `Error ${resp.status}: ${resp.text()}`;
  const data = resp.json();
  const events: any[] = data.chunk || [];
  const messages = events
    .filter((e: any) => e.type === "m.room.message")
    .map((e: any) => ({
      sender: e.sender,
      body: e.content?.body || "",
      msgtype: e.content?.msgtype || "",
      event_id: e.event_id,
      timestamp: e.origin_server_ts ? new Date(e.origin_server_ts).toISOString() : "",
    }));
  return JSON.stringify(messages, null, 2);
}

export async function getProfile(
  homeserver: string,
  token: string,
  userId: string,
): Promise<string> {
  const encoded = encodeURIComponent(userId);
  const resp = await matrixGet(homeserver, token, `/profile/${encoded}`);
  if (!resp.ok) return `Error ${resp.status}: ${resp.text()}`;
  const data = resp.json();
  return JSON.stringify({
    user_id: userId,
    displayname: data.displayname || "",
    avatar_url: data.avatar_url || "",
  }, null, 2);
}
