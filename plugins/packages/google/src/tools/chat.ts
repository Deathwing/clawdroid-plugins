import type { ToolResult } from "../../../../quickjs.d";
import { googleGetJson, googlePostJson } from "../api";
import { requiredString } from "../params";
import { clipText, keyValueTable, pluralize, statusBlock, successResult, tableBlock, textBlock } from "../result";

const CHAT_API_BASE = "https://chat.googleapis.com/v1";

type ToolInput = Record<string, unknown>;

export async function listSpaces(token: string): Promise<ToolResult> {
  const result = await googleGetJson(token, `${CHAT_API_BASE}/spaces`);
  const spaces = Array.isArray(result.spaces) ? result.spaces : [];
  if (spaces.length === 0) {
    return successResult(
      "No spaces found.",
      "0 spaces found",
      [statusBlock("No Google Chat spaces found.")],
    );
  }

  const rows = spaces.map((space: any, index: number) => [
    String(index + 1),
    safeString(space?.displayName, "(unnamed)"),
    safeString(space?.type, "?"),
    safeString(space?.name, "?"),
  ]);

  return successResult(
    buildStringMessage([
      `Google Chat Spaces (${spaces.length}):`,
      ...rows.map((row: string[]) => `  ${row[1]} (${row[2]}) - ${row[3]}`),
    ]),
    `${spaces.length} ${pluralize(spaces.length, "space")} found`,
    [
      statusBlock(`Loaded ${spaces.length} Google Chat ${pluralize(spaces.length, "space")}.`),
      tableBlock(["#", "Space", "Type", "Name"], rows),
    ],
  );
}

export async function sendChatMessage(token: string, input: ToolInput): Promise<ToolResult> {
  const rawSpaceId = requiredString(input, "space_id");
  const text = requiredString(input, "text");
  const spaceId = rawSpaceId.startsWith("spaces/") ? rawSpaceId : `spaces/${rawSpaceId}`;
  const result = await googlePostJson(token, `${CHAT_API_BASE}/${spaceId}/messages`, { text });
  const messageName = safeString(result.name, "?");

  return successResult(
    `Message sent to ${spaceId}. Name: ${messageName}`,
    "Message sent",
    [
      statusBlock(`Sent Google Chat message to ${spaceId}.`),
      keyValueTable([
        ["Space", spaceId],
        ["Name", messageName],
      ]),
      textBlock(clipText(text, 1000)),
    ],
  );
}

function safeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function buildStringMessage(lines: Array<string | undefined>): string {
  return lines.filter((line): line is string => line !== undefined).join("\n");
}