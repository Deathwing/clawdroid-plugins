// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import type { FetchResponse } from "../../../clawdroid.d";

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

/**
 * Instagram Graph API — uses Authorization header instead of query param
 * to avoid token leakage in logs and Referer headers.
 */
export async function igGet(token: string, url: string): Promise<FetchResponse> {
  return fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function igPost(
  token: string,
  url: string,
  params: Record<string, string> = {},
): Promise<FetchResponse> {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });
}

/** Resolve the authenticated user's Instagram ID */
export async function getUserId(token: string): Promise<string> {
  const resp = await igGet(token, `${GRAPH_BASE}/me?fields=id`);
  const data: { id?: string } = resp.json();
  if (!data.id) throw new Error("Could not resolve Instagram user ID");
  return data.id;
}

export { GRAPH_BASE };
