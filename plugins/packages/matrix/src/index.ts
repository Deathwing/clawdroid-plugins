// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

/**
 * ClawDroid Matrix Plugin — entry point
 *
 * Exports:
 * - discoverTools() + execute() — tool execution
 * - checkTrigger() — polling triggers
 * - matchEvent() — per-automation event filtering
 * - formatLabel() — human-readable trigger label
 * - buildConfig() — build trigger config from input
 */

import type { PluginContext, ToolResult, ToolError } from "../../../quickjs.d";
import { parseCredential, matrixGet } from "./api";
import { listRooms, joinRoom, getRoomInfo } from "./tools/rooms";
import { sendMessage, readRoom, getProfile } from "./tools/messages";

type ToolInput = Record<string, unknown>;

/** Tool definitions are declared in manifest.json */
export function discoverTools(): [] {
  return [];
}

/**
 * Dispatch a tool call to the appropriate handler.
 */
export async function execute(
  toolName: string,
  input: ToolInput,
  ctx: PluginContext,
): Promise<ToolResult | ToolError> {
  const raw = await ctx.host.getSecret("token");
  if (!raw) {
    return { error: true, message: "Matrix not connected. Add your credentials in Settings first." };
  }

  let homeserver: string;
  let token: string;
  try {
    const cred = parseCredential(raw);
    homeserver = cred.homeserver;
    token = cred.token;
  } catch (e: any) {
    return { error: true, message: e.message || "Invalid Matrix credential format" };
  }

  let result: string;
  switch (toolName) {
    case "matrix_send_message":
      result = await sendMessage(
        homeserver,
        token,
        String(input.room_id || ""),
        String(input.text || ""),
      );
      break;
    case "matrix_list_rooms":
      result = await listRooms(homeserver, token);
      break;
    case "matrix_read_room":
      result = await readRoom(
        homeserver,
        token,
        String(input.room_id || ""),
        input.limit ? Number(input.limit) : undefined,
      );
      break;
    case "matrix_join_room":
      result = await joinRoom(homeserver, token, String(input.room_id_or_alias || ""));
      break;
    case "matrix_get_room_info":
      result = await getRoomInfo(homeserver, token, String(input.room_id || ""));
      break;
    case "matrix_get_profile":
      result = await getProfile(homeserver, token, String(input.user_id || ""));
      break;
    default:
      return { error: true, message: `Unknown Matrix tool: ${toolName}` };
  }

  return { message: result };
}

// ─── Trigger Exports ────────────────────────────────────────

export async function checkTrigger(
  triggerType: string,
  config: Record<string, unknown>,
  state: Record<string, unknown>,
  ctx: PluginContext,
): Promise<{ events: Record<string, string>[]; state: Record<string, unknown> }> {
  if (triggerType !== "matrix_message") {
    return { events: [], state };
  }

  const raw = await ctx.host.getSecret("token");
  if (!raw) return { events: [], state };

  let homeserver: string;
  let token: string;
  try {
    const cred = parseCredential(raw);
    homeserver = cred.homeserver;
    token = cred.token;
  } catch {
    return { events: [], state };
  }

  const since = state.since as string | undefined;
  const filterParam = encodeURIComponent(JSON.stringify({
    room: { timeline: { limit: 50 } },
    presence: { types: [] },
    account_data: { types: [] },
  }));
  let path = `/sync?timeout=1000&filter=${filterParam}`;
  if (since) path += `&since=${encodeURIComponent(since)}`;

  const resp = await matrixGet(homeserver, token, path);
  if (!resp.ok) return { events: [], state };

  const data = resp.json();
  const nextBatch = data.next_batch as string | undefined;
  const events: Record<string, string>[] = [];

  const joinedRooms = data.rooms?.join || {};
  for (const roomId of Object.keys(joinedRooms)) {
    const timeline = joinedRooms[roomId].timeline?.events || [];
    for (const event of timeline) {
      if (event.type !== "m.room.message") continue;

      events.push({
        room_id: roomId,
        sender: event.sender || "",
        body: event.content?.body || "",
        event_id: event.event_id || "",
      });
    }
  }

  return {
    events,
    state: { ...state, since: nextBatch || since },
  };
}

export function matchEvent(
  _triggerType: string,
  config: Record<string, unknown>,
  eventData: Record<string, string>,
): Record<string, string> | null {
  const roomFilter = config.room_id as string | undefined;
  if (roomFilter && eventData.room_id !== roomFilter) {
    return null;
  }
  return eventData;
}

export function formatLabel(
  triggerType: string,
  config: Record<string, unknown>,
): string {
  const roomId = config.room_id as string | undefined;
  if (roomId) {
    return `New message in ${roomId}`;
  }
  return "New Matrix message";
}

export function buildConfig(
  _triggerType: string,
  input: Record<string, unknown>,
): Record<string, unknown> {
  const cfg: Record<string, string> = {};
  if (input.room_id) cfg.room_id = String(input.room_id);
  return cfg;
}
