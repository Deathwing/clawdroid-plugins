import type { ContentBlock, ToolError, ToolResult } from "../../../../quickjs.d";

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
    blocks: [{ type: "status", message, isSuccess: false }],
  };
}
