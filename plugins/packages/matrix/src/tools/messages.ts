// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import type { ToolResult } from "../../../quickjs.d";
import { matrixGet, matrixPut } from "../api";
import { clipText, failureResult, formatDateTime, keyValueTable, pluralize, statusBlock, successResult, tableBlock, textBlock } from "../result";

export async function sendMessage(
  homeserver: string,
  token: string,
  roomId: string,
  text: string,
): Promise<ToolResult> {
  const txnId = `m${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const encodedRoom = encodeURIComponent(roomId);
  const resp = await matrixPut(
    homeserver,
    token,
    `/rooms/${encodedRoom}/send/m.room.message/${txnId}`,
    { msgtype: "m.text", body: text },
  );
  if (!resp.ok) {
    return failureResult(`Error ${resp.status}: ${resp.text()}`, `Send failed for ${roomId}`);
  }
  const data = resp.json();
  const message = `Message sent (event: ${data.event_id || "unknown"})`;
  return successResult(message, "Message sent", [
    statusBlock(`Sent Matrix message to ${roomId}.`),
    keyValueTable([
      ["Room", roomId],
      ["Event ID", data.event_id || "unknown"],
    ]),
    textBlock(text),
  ]);
}

export async function readRoom(
  homeserver: string,
  token: string,
  roomId: string,
  limit?: number,
): Promise<ToolResult> {
  const encodedRoom = encodeURIComponent(roomId);
  const l = limit || 20;
  const resp = await matrixGet(homeserver, token, `/rooms/${encodedRoom}/messages?dir=b&limit=${l}`);
  if (!resp.ok) {
    return failureResult(`Error ${resp.status}: ${resp.text()}`, `Read failed for ${roomId}`);
  }
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
  if (!messages.length) {
    return successResult(
      "No messages found.",
      `0 messages found in ${roomId}`,
      [statusBlock(`No recent messages found in ${roomId}.`)],
    );
  }

  const message = [
    `Recent messages in ${roomId} (${messages.length}):`,
    "",
    ...messages.flatMap((entry, index) => [
      `${index + 1}. [${entry.timestamp || "?"}] ${entry.sender}: ${entry.body}`,
      `   Type: ${entry.msgtype || "?"} | Event: ${entry.event_id}`,
      "",
    ]),
  ].join("\n").trim();

  return successResult(
    message,
    `${messages.length} ${pluralize(messages.length, "message")} found in ${roomId}`,
    [
      statusBlock(`Loaded ${messages.length} ${pluralize(messages.length, "message")} from ${roomId}.`),
      tableBlock(
        ["#", "Sender", "Time", "Type", "Message"],
        messages.map((entry, index) => [
          String(index + 1),
          entry.sender,
          formatDateTime(entry.timestamp),
          entry.msgtype || "?",
          clipText(entry.body, 80),
        ]),
      ),
    ],
  );
}

export async function getProfile(
  homeserver: string,
  token: string,
  userId: string,
): Promise<ToolResult> {
  const encoded = encodeURIComponent(userId);
  const resp = await matrixGet(homeserver, token, `/profile/${encoded}`);
  if (!resp.ok) {
    return failureResult(`Error ${resp.status}: ${resp.text()}`, `Profile lookup failed for ${userId}`);
  }
  const data = resp.json();
  const message = [
    `User: ${userId}`,
    `Display name: ${data.displayname || "(none)"}`,
    `Avatar: ${data.avatar_url || "(none)"}`,
  ].join("\n");
  return successResult(message, `Profile ${userId}`, [
    statusBlock(`Loaded Matrix profile for ${userId}.`),
    keyValueTable([
      ["User", userId],
      ["Display name", data.displayname || "(none)"],
      ["Avatar", data.avatar_url || "(none)"],
    ]),
  ]);
}
