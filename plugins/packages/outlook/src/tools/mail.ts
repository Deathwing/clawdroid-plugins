// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { graphGet, graphPost } from "../api";
import { required, optional } from "../params";

export async function sendMail(
  token: string,
  input: Record<string, unknown>,
): Promise<string> {
  const to = required(input, "to");
  const subject = optional(input, "subject", "");
  const body = optional(input, "body", "");
  const contentType = optional(input, "content_type", "Text");

  const toRecipients = to
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)
    .map((address) => ({ emailAddress: { address } }));

  const ccStr = optional<string | null>(input, "cc", null);
  const ccRecipients = ccStr
    ? ccStr
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean)
        .map((address) => ({ emailAddress: { address } }))
    : undefined;

  const payload: Record<string, unknown> = {
    message: {
      subject,
      body: { contentType, content: body },
      toRecipients,
      ...(ccRecipients ? { ccRecipients } : {}),
    },
  };

  await graphPost(token, "/me/sendMail", payload);
  return `Email sent to ${to}.`;
}

export async function listMail(
  token: string,
  input: Record<string, unknown>,
): Promise<string> {
  const top = optional(input, "top", 10);
  let path = `/me/messages?$top=${top}&$orderby=receivedDateTime desc`;
  const filter = optional<string | null>(input, "filter", null);
  if (filter) {
    path += `&$filter=${encodeURIComponent(filter)}`;
  }
  const obj = await graphGet(token, path);
  const messages: any[] = obj.value || [];
  if (!messages.length) return "No messages found.";
  const lines = [`Inbox (${messages.length} messages):`];
  for (const m of messages) {
    const subject = m.subject || "(no subject)";
    const from = m.from?.emailAddress?.address || "?";
    const received = m.receivedDateTime || "";
    const isRead = m.isRead ?? "?";
    const id = m.id || "?";
    lines.push(`  [${received}] From: ${from} | ${subject} (read=${isRead}) ID: ${id}`);
  }
  return lines.join("\n");
}

export async function readMail(
  token: string,
  input: Record<string, unknown>,
): Promise<string> {
  const messageId = required(input, "message_id");
  const m = await graphGet(token, `/me/messages/${messageId}`);
  return [
    `From: ${m.from?.emailAddress?.address || "?"}`,
    `Subject: ${m.subject || "(no subject)"}`,
    `Received: ${m.receivedDateTime || "?"}`,
    `Read: ${m.isRead ?? "?"}`,
    `Body:\n${m.body?.content || ""}`,
  ].join("\n");
}

export async function searchMail(
  token: string,
  input: Record<string, unknown>,
): Promise<string> {
  const query = required(input, "query");
  const top = optional(input, "top", 10);
  const encoded = encodeURIComponent(query);
  const obj = await graphGet(token, `/me/messages?$search="${encoded}"&$top=${top}`);
  const messages: any[] = obj.value || [];
  if (!messages.length) return "No messages found.";
  const lines = [`Search results (${messages.length}):`];
  for (const m of messages) {
    const subject = m.subject || "(no subject)";
    const from = m.from?.emailAddress?.address || "?";
    const id = m.id || "?";
    lines.push(`  From: ${from} | ${subject} (ID: ${id})`);
  }
  return lines.join("\n");
}
