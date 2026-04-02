import type { PluginContext } from "../../../../quickjs.d";
import { buildQuery, googleGetJson } from "../api";
import { clamp } from "../params";

interface TriggerState {
  emittedEventIds?: string[];
}

interface TriggerEvent {
  event_title: string;
  start_time: string;
  end_time: string;
  location: string;
  event_id: string;
}

const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

export async function checkCalendarTrigger(
  config: Record<string, unknown>,
  state: TriggerState,
  ctx: PluginContext,
): Promise<{ events: TriggerEvent[]; state: TriggerState }> {
  const token = await ctx.host.getSecret("token");
  if (!token) return { events: [], state };

  const rawMinutes = Number.parseInt(String(config.minutes_before || "10"), 10);
  const minutesBefore = clamp(Number.isFinite(rawMinutes) ? rawMinutes : 10, 1, 60);
  const calendarId = typeof config.calendar_id === "string" && config.calendar_id.trim().length > 0
    ? config.calendar_id.trim()
    : "primary";

  const now = new Date();
  const soon = new Date(now.getTime() + minutesBefore * 60 * 1000);
  const result = await googleGetJson(
    token,
    `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${buildQuery({
      timeMin: now.toISOString(),
      timeMax: soon.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: 5,
    })}`,
  );

  const calendarEvents = Array.isArray(result.items) ? result.items : [];
  const emittedIds = Array.isArray(state.emittedEventIds) ? state.emittedEventIds.map(String) : [];
  const emittedSet = new Set(emittedIds);
  const events: TriggerEvent[] = [];

  for (const event of calendarEvents) {
    const eventId = safeString(event?.id, "");
    if (!eventId || emittedSet.has(eventId)) continue;

    events.push({
      event_title: safeString(event?.summary, "(no title)"),
      start_time: eventDateTime(event?.start),
      end_time: eventDateTime(event?.end),
      location: safeString(event?.location, ""),
      event_id: eventId,
    });
    emittedSet.add(eventId);
  }

  return {
    events,
    state: {
      ...state,
      emittedEventIds: Array.from(emittedSet).slice(-100),
    },
  };
}

function eventDateTime(value: any): string {
  return safeString(value?.dateTime, safeString(value?.date, ""));
}

function safeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}