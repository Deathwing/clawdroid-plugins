// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import type { ToolResult } from "../../../quickjs.d";
import { graphGet, graphPost } from "../api";
import { required, optional } from "../params";
import { keyValueTable, pluralize, statusBlock, successResult, tableBlock, textBlock } from "../result";

export async function listEvents(
  token: string,
  input: Record<string, unknown>,
): Promise<ToolResult> {
  const top = optional(input, "top", 10);
  const startTime = optional<string | null>(input, "start_time", null);
  const endTime = optional<string | null>(input, "end_time", null);

  const path =
    startTime && endTime
      ? `/me/calendarview?startdatetime=${startTime}&enddatetime=${endTime}&$top=${top}&$orderby=start/dateTime`
      : `/me/events?$top=${top}&$orderby=start/dateTime`;

  const obj = await graphGet(token, path);
  const events: any[] = obj.value || [];
  if (!events.length) {
    return successResult("No events found.", "0 events found", [statusBlock("No Outlook events found.")]);
  }
  const lines = [`Calendar Events (${events.length}):`];
  const rows = events.map((e, index) => {
    const subject = e.subject || "(no title)";
    const start = e.start?.dateTime || "?";
    const id = e.id || "?";
    lines.push(`  [${start}] ${subject} (ID: ${id})`);
    return [String(index + 1), start, subject, id];
  });

  return successResult(
    lines.join("\n"),
    `${events.length} ${pluralize(events.length, "event")} found`,
    [
      statusBlock(`Loaded ${events.length} calendar ${pluralize(events.length, "event")}.`),
      tableBlock(["#", "Start", "Subject", "ID"], rows),
    ],
  );
}

export async function createEvent(
  token: string,
  input: Record<string, unknown>,
): Promise<ToolResult> {
  const subject = required(input, "subject");
  const startTime = required(input, "start_time");
  const endTime = required(input, "end_time");
  const timeZone = optional(input, "time_zone", "UTC");

  const payload: Record<string, unknown> = {
    subject,
    start: { dateTime: startTime, timeZone },
    end: { dateTime: endTime, timeZone },
  };

  const bodyText = optional<string | null>(input, "body", null);
  if (bodyText) {
    payload.body = { contentType: "Text", content: bodyText };
  }

  const location = optional<string | null>(input, "location", null);
  if (location) {
    payload.location = { displayName: location };
  }

  const attendeesStr = optional<string | null>(input, "attendees", null);
  if (attendeesStr) {
    payload.attendees = attendeesStr
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean)
      .map((email) => ({
        emailAddress: { address: email },
        type: "required",
      }));
  }

  const obj = await graphPost(token, "/me/events", payload);
  const message = `Event created: ${obj.subject || subject} (ID: ${obj.id || "?"})`;
  const blocks = [
    statusBlock(`Created Outlook event ${obj.subject || subject}.`),
    keyValueTable([
      ["Subject", obj.subject || subject],
      ["Start", obj.start?.dateTime || startTime],
      ["End", obj.end?.dateTime || endTime],
      ["Time zone", obj.start?.timeZone || timeZone],
      ["Location", obj.location?.displayName || location || ""],
      ["ID", obj.id || "?"],
    ]),
  ];
  if (bodyText) {
    blocks.push(textBlock(bodyText));
  }
  return successResult(message, "Event created", blocks);
}
