import type { ToolResult } from "../../../../quickjs.d";
import { buildQuery, googleGetJson, googlePostJson } from "../api";
import { optionalInteger, optionalString, requiredString } from "../params";
import { clipText, keyValueTable, pluralize, statusBlock, successResult, tableBlock, textBlock } from "../result";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

type ToolInput = Record<string, unknown>;

export async function sendEmail(token: string, input: ToolInput): Promise<ToolResult> {
  const to = requiredString(input, "to");
  const subject = requiredString(input, "subject");
  const body = requiredString(input, "body");
  const cc = optionalString(input, "cc");
  const bcc = optionalString(input, "bcc");

  const rawMessage = buildStringMessage([
    `To: ${to}`,
    cc ? `Cc: ${cc}` : undefined,
    bcc ? `Bcc: ${bcc}` : undefined,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ]);

  const result = await googlePostJson(token, `${GMAIL_API_BASE}/messages/send`, {
    raw: toBase64Url(rawMessage),
  });

  const messageId = safeString(result.id, "unknown");
  return successResult(
    `Email sent. Message ID: ${messageId}`,
    "Email sent",
    [
      statusBlock(`Sent Gmail email to ${to}.`),
      keyValueTable([
        ["To", to],
        ["CC", cc],
        ["BCC", bcc],
        ["Subject", subject],
        ["Message ID", messageId],
      ]),
      ...(body.trim().length > 0 ? [textBlock(clipText(body, 1000))] : []),
    ],
  );
}

export async function searchEmails(token: string, input: ToolInput): Promise<ToolResult> {
  const query = requiredString(input, "query");
  const maxResults = optionalInteger(input, "max_results", 10);
  const result = await googleGetJson(
    token,
    `${GMAIL_API_BASE}/messages?${buildQuery({ q: query, maxResults })}`,
  );

  const messages = Array.isArray(result.messages) ? result.messages : [];
  if (messages.length === 0) {
    return successResult(
      "No messages found.",
      "0 messages found",
      [statusBlock(`No Gmail messages matched "${query}".`)],
    );
  }

  const rows = messages.map((message: any, index: number) => {
    const id = safeString(message?.id, "?");
    const threadId = safeString(message?.threadId, "?");
    return [String(index + 1), id, threadId];
  });

  return successResult(
    buildStringMessage([
      `Found ${messages.length} messages:`,
      ...rows.map((row: string[]) => `  ${row[0]}. ID: ${row[1]}  Thread: ${row[2]}`),
      "",
      "Use gmail_read_email with a message ID to read full content.",
    ]),
    `${messages.length} ${pluralize(messages.length, "message")} found`,
    [
      statusBlock(`Found ${messages.length} ${pluralize(messages.length, "message")} for "${query}".`),
      tableBlock(["#", "Message ID", "Thread ID"], rows),
    ],
  );
}

export async function readEmail(token: string, input: ToolInput): Promise<ToolResult> {
  const messageId = requiredString(input, "message_id");
  const result = await googleGetJson(token, `${GMAIL_API_BASE}/messages/${encodeURIComponent(messageId)}?format=full`);
  const headers = Array.isArray(result.payload?.headers) ? result.payload.headers : [];
  const subject = headerValue(headers, "Subject") || "(no subject)";
  const from = headerValue(headers, "From") || "unknown";
  const date = headerValue(headers, "Date") || "";
  const snippet = safeString(result.snippet, "");

  return successResult(
    buildStringMessage([
      `From: ${from}`,
      `Subject: ${subject}`,
      `Date: ${date}`,
      `Snippet: ${snippet}`,
    ]),
    `Email ${subject}`,
    [
      statusBlock(`Loaded Gmail email ${messageId}.`),
      keyValueTable([
        ["From", from],
        ["Subject", subject],
        ["Date", date],
        ["Message ID", messageId],
      ]),
      ...(snippet.trim().length > 0 ? [textBlock(clipText(snippet, 1000))] : []),
    ],
  );
}

export async function listLabels(token: string): Promise<ToolResult> {
  const result = await googleGetJson(token, `${GMAIL_API_BASE}/labels`);
  const labels = Array.isArray(result.labels) ? result.labels : [];
  if (labels.length === 0) {
    return successResult(
      "No labels found.",
      "0 labels found",
      [statusBlock("No Gmail labels found.")],
    );
  }

  const rows = labels.map((label: any, index: number) => [
    String(index + 1),
    safeString(label?.name, "?"),
    safeString(label?.id, "?"),
  ]);

  return successResult(
    buildStringMessage([
      "Gmail Labels:",
      ...rows.map((row: string[]) => `  ${row[1]} (ID: ${row[2]})`),
    ]),
    `${labels.length} ${pluralize(labels.length, "label")} found`,
    [
      statusBlock(`Loaded ${labels.length} Gmail ${pluralize(labels.length, "label")}.`),
      tableBlock(["#", "Label", "ID"], rows),
    ],
  );
}

function headerValue(headers: any[], name: string): string | undefined {
  const header = headers.find((entry) => safeString(entry?.name, "") === name);
  const value = safeString(header?.value, "");
  return value || undefined;
}

function safeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function buildStringMessage(lines: Array<string | undefined>): string {
  return lines.filter((line): line is string => line !== undefined).join("\n");
}

function toBase64Url(value: string): string {
  return btoa(utf8ToBinary(value))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function utf8ToBinary(value: string): string {
  const encoded = encodeURIComponent(value);
  let binary = "";
  for (let index = 0; index < encoded.length; index += 1) {
    const char = encoded[index];
    if (char === "%") {
      binary += String.fromCharCode(Number.parseInt(encoded.slice(index + 1, index + 3), 16));
      index += 2;
    } else {
      binary += char;
    }
  }
  return binary;
}