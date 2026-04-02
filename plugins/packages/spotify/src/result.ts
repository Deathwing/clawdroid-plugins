// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import type { ContentBlock, ToolError, ToolResult } from "../../../quickjs.d";

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

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
  const normalized = cleanText(value);
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

export function cleanText(value: string | null | undefined): string {
  const withoutTags = value?.replace(/<[^>]+>/g, " ") ?? "";
  const decoded = withoutTags.replace(/&(amp|lt|gt|quot|#39);/g, (entity) => HTML_ENTITIES[entity] ?? entity);
  return decoded.replace(/\s+/g, " ").trim();
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || Number.isNaN(ms)) {
    return "-";
  }
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export function formatNumber(value: number | string | null | undefined, fallback = "0"): string {
  const normalized = typeof value === "string" ? Number(value) : value;
  if (normalized === null || normalized === undefined || Number.isNaN(normalized)) {
    return fallback;
  }
  return Number(normalized).toLocaleString();
}

export function artistNames(artists: Array<{ name: string }> | null | undefined): string {
  if (!artists || artists.length === 0) {
    return "Unknown";
  }
  return artists.map((artist) => artist.name).join(", ");
}

export function spotifyUri(kind: string, id: string | null | undefined): string {
  return id ? `spotify:${kind}:${id}` : "";
}