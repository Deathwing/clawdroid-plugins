// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { graphGet } from "../api";

interface TriggerEvent {
  event_title: string;
  start_time: string;
  end_time: string;
  location: string;
  event_id: string;
}

declare const host: {
  getSecret(key: string): Promise<string | null>;
  httpFetch(
    url: string,
    method: string,
    headersJson: string,
    body?: string | null,
  ): Promise<{ status: number; body: string; json(): any }>;
};

export async function checkCalendarTrigger(
  config: Record<string, unknown>,
  state: Record<string, unknown>,
): Promise<{ events: TriggerEvent[]; state: Record<string, unknown> }> {
  const token = await host.getSecret("token");
  if (!token) return { events: [], state };

  const minutesBefore = Math.max(1, Math.min(60, parseInt(String(config.minutes_before || "10"), 10) || 10));
  const now = new Date();
  const soon = new Date(now.getTime() + minutesBefore * 60 * 1000);
  const startTime = encodeURIComponent(now.toISOString());
  const endTime = encodeURIComponent(soon.toISOString());

  const obj = await graphGet(
    token,
    `/me/calendarview?startdatetime=${startTime}&enddatetime=${endTime}&$top=5&$orderby=start/dateTime`,
  );

  const calEvents: any[] = obj.value || [];
  const events: TriggerEvent[] = [];

  // Track already-emitted event IDs to prevent duplicate triggers
  const emittedIds: string[] = Array.isArray(state.emittedEventIds) ? state.emittedEventIds as string[] : [];
  const emittedSet = new Set(emittedIds);

  for (const e of calEvents) {
    const eventId = e.id;
    if (!eventId || emittedSet.has(eventId)) continue;
    events.push({
      event_title: e.subject || "(no title)",
      start_time: e.start?.dateTime || "",
      end_time: e.end?.dateTime || "",
      location: e.location?.displayName || "",
      event_id: eventId,
    });
    emittedSet.add(eventId);
  }

  // Keep only the last 100 emitted IDs to bound memory
  const updatedIds = [...emittedSet].slice(-100);

  return { events, state: { ...state, emittedEventIds: updatedIds } };
}
