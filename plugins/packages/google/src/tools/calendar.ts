import type { ToolResult } from "../../../../quickjs.d";
import { buildQuery, googleGetJson, googlePostJson } from "../api";
import { optionalInteger, optionalString, requiredString } from "../params";
import { clipText, keyValueTable, pluralize, statusBlock, successResult, tableBlock, textBlock } from "../result";

const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

type ToolInput = Record<string, unknown>;

export async function listEvents(token: string, input: ToolInput): Promise<ToolResult> {
  const calendarId = optionalString(input, "calendar_id") || "primary";
  const maxResults = optionalInteger(input, "max_results", 10);
  const timeMin = optionalString(input, "time_min");
  const timeMax = optionalString(input, "time_max");
  const encodedCalendarId = encodeURIComponent(calendarId);
  const query = buildQuery({
    maxResults,
    singleEvents: "true",
    orderBy: "startTime",
    timeMin,
    timeMax,
  });

  const result = await googleGetJson(
    token,
    `${CALENDAR_API_BASE}/calendars/${encodedCalendarId}/events?${query}`,
  );

  const events = Array.isArray(result.items) ? result.items : [];
  if (events.length === 0) {
    return successResult(
      "No events found.",
      "0 events found",
      [statusBlock(`No Google Calendar events found for ${calendarId}.`)],
    );
  }

  const rows = events.map((event: any, index: number) => [
    String(index + 1),
    eventDateTime(event?.start),
    safeString(event?.summary, "(no title)"),
    safeString(event?.id, "?"),
  ]);

  return successResult(
    buildStringMessage([
      `Calendar Events (${events.length}):`,
      ...rows.map((row: string[]) => `  [${row[1]}] ${row[2]} (ID: ${row[3]})`),
    ]),
    `${events.length} ${pluralize(events.length, "event")} found`,
    [
      statusBlock(`Loaded ${events.length} Google Calendar ${pluralize(events.length, "event")} from ${calendarId}.`),
      tableBlock(["#", "Start", "Summary", "ID"], rows),
    ],
  );
}

export async function createEvent(token: string, input: ToolInput): Promise<ToolResult> {
  const summary = requiredString(input, "summary");
  const startTime = requiredString(input, "start_time");
  const endTime = requiredString(input, "end_time");
  const calendarId = optionalString(input, "calendar_id") || "primary";
  const description = optionalString(input, "description");
  const location = optionalString(input, "location");
  const attendees = parseCsv(optionalString(input, "attendees"));

  const payload: Record<string, unknown> = {
    summary,
    start: { dateTime: startTime },
    end: { dateTime: endTime },
  };
  if (description) payload.description = description;
  if (location) payload.location = location;
  if (attendees.length > 0) {
    payload.attendees = attendees.map((email) => ({ email }));
  }

  const encodedCalendarId = encodeURIComponent(calendarId);
  const result = await googlePostJson(
    token,
    `${CALENDAR_API_BASE}/calendars/${encodedCalendarId}/events`,
    payload,
  );

  const createdSummary = safeString(result.summary, summary);
  const eventId = safeString(result.id, "?");

  return successResult(
    `Event created: ${createdSummary} (ID: ${eventId})`,
    "Event created",
    [
      statusBlock(`Created Google Calendar event ${createdSummary}.`),
      keyValueTable([
        ["Summary", createdSummary],
        ["Start", startTime],
        ["End", endTime],
        ["Calendar", calendarId],
        ["Location", location],
        ["ID", eventId],
      ]),
      ...(description ? [textBlock(clipText(description, 1000))] : []),
    ],
  );
}

export async function getEvent(token: string, input: ToolInput): Promise<ToolResult> {
  const eventId = requiredString(input, "event_id");
  const calendarId = optionalString(input, "calendar_id") || "primary";
  const encodedCalendarId = encodeURIComponent(calendarId);
  const result = await googleGetJson(
    token,
    `${CALENDAR_API_BASE}/calendars/${encodedCalendarId}/events/${encodeURIComponent(eventId)}`,
  );

  const summary = safeString(result.summary, "(no title)");
  const start = eventDateTime(result.start);
  const end = eventDateTime(result.end);
  const description = optionalValue(result.description);
  const location = optionalValue(result.location);
  const status = optionalValue(result.status);

  return successResult(
    buildStringMessage([
      `Event: ${summary}`,
      `Start: ${start}`,
      `End: ${end}`,
      description ? `Description: ${description}` : undefined,
      location ? `Location: ${location}` : undefined,
      status ? `Status: ${status}` : undefined,
    ]),
    `Event ${summary}`,
    [
      statusBlock(`Loaded Google Calendar event ${summary}.`),
      keyValueTable([
        ["Summary", summary],
        ["Start", start],
        ["End", end],
        ["Calendar", calendarId],
        ["Location", location],
        ["Status", status],
        ["ID", eventId],
      ]),
      ...(description ? [textBlock(clipText(description, 1000))] : []),
    ],
  );
}

function eventDateTime(value: any): string {
  return safeString(value?.dateTime, safeString(value?.date, "?"));
}

function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(",").map((entry) => entry.trim()).filter((entry) => entry.length > 0);
}

function optionalValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function safeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function buildStringMessage(lines: Array<string | undefined>): string {
  return lines.filter((line): line is string => line !== undefined).join("\n");
}