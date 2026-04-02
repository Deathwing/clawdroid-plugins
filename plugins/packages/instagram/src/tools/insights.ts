// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import type { ToolResult } from "../../../quickjs.d";
import { igGet, GRAPH_BASE } from "../api";
import { required } from "../params";
import { pluralize, statusBlock, successResult, tableBlock } from "../result";
import type { IgInsightMetric, IgPagedResponse } from "../types";

export async function getInsights(
  token: string,
  input: Record<string, unknown>,
): Promise<ToolResult> {
  const mediaId = required(input, "media_id");
  const resp = await igGet(
    token,
    `${GRAPH_BASE}/${mediaId}/insights?metric=impressions,reach,engagement,saved`,
  );
  const obj: IgPagedResponse<IgInsightMetric> = resp.json();
  const data = obj.data || [];
  if (!data.length) {
    return successResult(
      "No insights available (insights require a Business/Creator account).",
      "0 insight metrics",
      [statusBlock("No insights available for this media item.")],
    );
  }
  const lines = [`Media Insights for ${mediaId}:`];
  const rows = data.map((metric) => {
    const value = metric.values?.[0]?.value ?? 0;
    lines.push(`  ${metric.name}: ${value}`);
    return [metric.name, String(value)];
  });

  return successResult(
    lines.join("\n"),
    `${data.length} insight ${pluralize(data.length, "metric")} loaded`,
    [
      statusBlock(`Loaded ${data.length} insight ${pluralize(data.length, "metric")} for media ${mediaId}.`),
      tableBlock(["Metric", "Value"], rows),
    ],
  );
}
