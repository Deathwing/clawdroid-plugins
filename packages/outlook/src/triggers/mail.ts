// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { graphGet } from "../api";

interface TriggerState {
  lastMailCursor?: string;
}

interface TriggerEvent {
  from: string;
  subject: string;
  preview: string;
  message_id: string;
  timestamp: string;
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

export async function checkMailTrigger(
  _config: Record<string, unknown>,
  state: TriggerState,
): Promise<{ events: TriggerEvent[]; state: TriggerState }> {
  const token = await host.getSecret("token");
  if (!token) return { events: [], state };

  const cursor = state.lastMailCursor || new Date().toISOString();
  const filter = encodeURIComponent(`receivedDateTime gt ${cursor}`);
  const obj = await graphGet(
    token,
    `/me/messages?$filter=${filter}&$orderby=receivedDateTime desc&$top=5`,
  );

  const messages: any[] = obj.value || [];
  const events: TriggerEvent[] = [];

  for (const m of messages) {
    const msgId = m.id;
    if (!msgId) continue;
    events.push({
      from: m.from?.emailAddress?.address || "unknown",
      subject: m.subject || "(no subject)",
      preview: m.bodyPreview || "",
      message_id: msgId,
      timestamp: new Date().toISOString(),
    });
  }

  // Advance cursor to the newest receivedDateTime we actually processed,
  // not current wall-clock time, to avoid skipping messages in the gap.
  let newCursor = cursor;
  for (const m of messages) {
    if (m.receivedDateTime && m.receivedDateTime > newCursor) {
      newCursor = m.receivedDateTime;
    }
  }

  return {
    events,
    state: { ...state, lastMailCursor: newCursor },
  };
}
