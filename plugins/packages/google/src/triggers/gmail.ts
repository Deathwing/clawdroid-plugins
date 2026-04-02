import type { PluginContext } from "../../../../quickjs.d";
import { buildQuery, googleGetJson } from "../api";

interface TriggerState {
  lastMailTimestamp?: number;
  seenMessageIds?: string[];
}

interface TriggerEvent {
  from: string;
  subject: string;
  snippet: string;
  message_id: string;
  timestamp: string;
}

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

export async function checkGmailTrigger(
  _config: Record<string, unknown>,
  state: TriggerState,
  ctx: PluginContext,
): Promise<{ events: TriggerEvent[]; state: TriggerState }> {
  const token = await ctx.host.getSecret("token");
  if (!token) return { events: [], state };

  const nowSeconds = Math.floor(Date.now() / 1000);
  const lastMailTimestamp = parseTimestamp(state.lastMailTimestamp, nowSeconds);
  const messagesResponse = await googleGetJson(
    token,
    `${GMAIL_API_BASE}/messages?${buildQuery({ q: `is:inbox after:${lastMailTimestamp}`, maxResults: 5 })}`,
  );

  const messages = Array.isArray(messagesResponse.messages) ? messagesResponse.messages : [];
  const seenIds = Array.isArray(state.seenMessageIds) ? state.seenMessageIds.map(String) : [];
  const seenSet = new Set(seenIds);
  const events: TriggerEvent[] = [];
  let newestTimestamp = lastMailTimestamp;

  for (const message of messages) {
    const messageId = safeString(message?.id, "");
    if (!messageId || seenSet.has(messageId)) continue;

    const detail = await googleGetJson(
      token,
      `${GMAIL_API_BASE}/messages/${encodeURIComponent(messageId)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
    );
    const headers = Array.isArray(detail.payload?.headers) ? detail.payload.headers : [];
    const internalDate = Number.parseInt(String(detail.internalDate || "0"), 10);
    if (Number.isFinite(internalDate) && internalDate > 0) {
      newestTimestamp = Math.max(newestTimestamp, Math.floor(internalDate / 1000));
    }

    events.push({
      from: headerValue(headers, "From") || "unknown",
      subject: headerValue(headers, "Subject") || "(no subject)",
      snippet: safeString(detail.snippet, ""),
      message_id: messageId,
      timestamp: new Date().toISOString(),
    });
    seenSet.add(messageId);
  }

  return {
    events,
    state: {
      ...state,
      lastMailTimestamp: newestTimestamp,
      seenMessageIds: Array.from(seenSet).slice(-100),
    },
  };
}

function parseTimestamp(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function headerValue(headers: any[], name: string): string | undefined {
  const header = headers.find((entry) => safeString(entry?.name, "") === name);
  const value = safeString(header?.value, "");
  return value || undefined;
}

function safeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}