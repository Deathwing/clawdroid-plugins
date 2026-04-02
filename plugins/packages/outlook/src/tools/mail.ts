// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import type { ToolResult } from "../../../quickjs.d";
import { graphGet, graphPost } from "../api";
import { required, optional } from "../params";
import { cleanText, clipText, keyValueTable, pluralize, statusBlock, successResult, tableBlock, textBlock } from "../result";

export async function sendMail(
  token: string,
  input: Record<string, unknown>,
): Promise<ToolResult> {
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
  const message = `Email sent to ${to}.`;
  const blocks = [
    statusBlock(`Sent email to ${to}.`),
    keyValueTable([
      ["To", to],
      ["CC", ccStr || ""],
      ["Subject", subject || "(no subject)"],
      ["Content type", contentType],
    ]),
  ];
  if (body) {
    blocks.push(textBlock(body));
  }
  return successResult(message, "Email sent", blocks);
}

export async function listMail(
  token: string,
  input: Record<string, unknown>,
): Promise<ToolResult> {
  const top = optional(input, "top", 10);
  let path = `/me/messages?$top=${top}&$orderby=receivedDateTime desc`;
  const filter = optional<string | null>(input, "filter", null);
  if (filter) {
    path += `&$filter=${encodeURIComponent(filter)}`;
  }
  const obj = await graphGet(token, path);
  const messages: any[] = obj.value || [];
  if (!messages.length) {
    return successResult("No messages found.", "0 messages found", [statusBlock("No Outlook messages found.")]);
  }
  const lines = [`Inbox (${messages.length} messages):`];
  const rows = messages.map((m, index) => {
    const subject = m.subject || "(no subject)";
    const from = m.from?.emailAddress?.address || "?";
    const received = m.receivedDateTime || "";
    const isRead = m.isRead ?? "?";
    const id = m.id || "?";
    lines.push(`  [${received}] From: ${from} | ${subject} (read=${isRead}) ID: ${id}`);
    return [
      String(index + 1),
      from,
      clipText(subject, 60),
      received,
      String(isRead),
      id,
    ];
  });

  return successResult(
    lines.join("\n"),
    `${messages.length} ${pluralize(messages.length, "message")} found`,
    [
      statusBlock(`Loaded ${messages.length} Outlook ${pluralize(messages.length, "message")}.`),
      tableBlock(["#", "From", "Subject", "Received", "Read", "ID"], rows),
    ],
  );
}

export async function readMail(
  token: string,
  input: Record<string, unknown>,
): Promise<ToolResult> {
  const messageId = required(input, "message_id");
  const m = await graphGet(token, `/me/messages/${messageId}`);
  const message = [
    `From: ${m.from?.emailAddress?.address || "?"}`,
    `Subject: ${m.subject || "(no subject)"}`,
    `Received: ${m.receivedDateTime || "?"}`,
    `Read: ${m.isRead ?? "?"}`,
    `Body:\n${m.body?.content || ""}`,
  ].join("\n");

  const bodyText = cleanText(m.body?.content || "");
  const blocks = [
    statusBlock(`Loaded Outlook message ${messageId}.`),
    keyValueTable([
      ["From", m.from?.emailAddress?.address || "?"],
      ["Subject", m.subject || "(no subject)"],
      ["Received", m.receivedDateTime || "?"],
      ["Read", String(m.isRead ?? "?")],
      ["ID", messageId],
    ]),
  ];
  if (bodyText) {
    blocks.push(textBlock(clipText(bodyText, 1000)));
  }
  return successResult(message, `Email ${m.subject || messageId}`, blocks);
}

export async function searchMail(
  token: string,
  input: Record<string, unknown>,
): Promise<ToolResult> {
  const query = required(input, "query");
  const top = optional(input, "top", 10);
  const encoded = encodeURIComponent(query);
  const obj = await graphGet(token, `/me/messages?$search="${encoded}"&$top=${top}`);
  const messages: any[] = obj.value || [];
  if (!messages.length) {
    return successResult("No messages found.", "0 messages found", [statusBlock(`No messages found for "${query}".`)]);
  }
  const lines = [`Search results (${messages.length}):`];
  const rows = messages.map((m, index) => {
    const subject = m.subject || "(no subject)";
    const from = m.from?.emailAddress?.address || "?";
    const id = m.id || "?";
    lines.push(`  From: ${from} | ${subject} (ID: ${id})`);
    return [String(index + 1), from, clipText(subject, 60), id];
  });

  return successResult(
    lines.join("\n"),
    `${messages.length} ${pluralize(messages.length, "message")} found`,
    [
      statusBlock(`Found ${messages.length} Outlook ${pluralize(messages.length, "message")} for "${query}".`),
      tableBlock(["#", "From", "Subject", "ID"], rows),
    ],
  );
}
