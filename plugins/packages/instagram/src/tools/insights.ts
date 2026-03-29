// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { igGet, GRAPH_BASE } from "../api";
import { required } from "../params";
import type { IgInsightMetric, IgPagedResponse } from "../types";

export async function getInsights(
  token: string,
  input: Record<string, unknown>,
): Promise<string> {
  const mediaId = required(input, "media_id");
  const resp = await igGet(
    token,
    `${GRAPH_BASE}/${mediaId}/insights?metric=impressions,reach,engagement,saved`,
  );
  const obj: IgPagedResponse<IgInsightMetric> = resp.json();
  const data = obj.data || [];
  if (!data.length)
    return "No insights available (insights require a Business/Creator account).";
  const lines = [`Media Insights for ${mediaId}:`];
  for (const metric of data) {
    const value = metric.values?.[0]?.value ?? 0;
    lines.push(`  ${metric.name}: ${value}`);
  }
  return lines.join("\n");
}
