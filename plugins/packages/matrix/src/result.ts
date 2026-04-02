// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import type { ContentBlock, ToolError, ToolResult } from "../../../quickjs.d";

export function successResult(
  message: string,
  summary: string,
  blocks: ContentBlock[] = [],
): ToolResult {
  return blocks.length > 0 ? { message, summary, blocks } : { message, summary };
}

export function errorResult(message: string, summary: string): ToolError {
  return {
    error: true,
    message,
    summary,
    blocks: [statusBlock(message, false)],
  };
}

export function failureResult(message: string, summary: string): ToolResult {
  return {
    message,
    summary,
    blocks: [statusBlock(message, false)],
  };
}

export function statusBlock(message: string, isSuccess = true): ContentBlock {
  return { type: "status", message, isSuccess };
}

export function textBlock(text: string): ContentBlock {
  return { type: "text", text };
}

export function tableBlock(headers: string[], rows: string[][]): ContentBlock {
  return { type: "table", headers, rows };
}

export function keyValueTable(entries: Array<readonly [string, string]>): ContentBlock {
  return tableBlock(
    ["Field", "Value"],
    entries
      .filter(([, value]) => value.trim().length > 0)
      .map(([field, value]) => [field, value]),
  );
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

export function clipText(value: string | null | undefined, maxLength: number): string {
  const normalized = value?.replace(/\s+/g, " ").trim() ?? "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  return value.replace("T", " ").replace("Z", "").slice(0, 19);
}