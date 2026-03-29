// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { graphGet, graphPost } from "../api";
import { required, optional } from "../params";

export async function listEvents(
  token: string,
  input: Record<string, unknown>,
): Promise<string> {
  const top = optional(input, "top", 10);
  const startTime = optional<string | null>(input, "start_time", null);
  const endTime = optional<string | null>(input, "end_time", null);

  const path =
    startTime && endTime
      ? `/me/calendarview?startdatetime=${startTime}&enddatetime=${endTime}&$top=${top}&$orderby=start/dateTime`
      : `/me/events?$top=${top}&$orderby=start/dateTime`;

  const obj = await graphGet(token, path);
  const events: any[] = obj.value || [];
  if (!events.length) return "No events found.";
  const lines = [`Calendar Events (${events.length}):`];
  for (const e of events) {
    const subject = e.subject || "(no title)";
    const start = e.start?.dateTime || "?";
    const id = e.id || "?";
    lines.push(`  [${start}] ${subject} (ID: ${id})`);
  }
  return lines.join("\n");
}

export async function createEvent(
  token: string,
  input: Record<string, unknown>,
): Promise<string> {
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
  return `Event created: ${obj.subject || subject} (ID: ${obj.id || "?"})`;
}
