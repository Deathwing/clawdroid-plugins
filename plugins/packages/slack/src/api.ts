// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import type { FetchResponse } from "../../../quickjs.d";

const API_BASE = "https://slack.com/api";

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json; charset=utf-8",
  };
}

export async function slackPost(
  token: string,
  method: string,
  body?: Record<string, unknown>,
): Promise<FetchResponse> {
  return fetch(`${API_BASE}/${method}`, {
    method: "POST",
    headers: authHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function slackGet(
  token: string,
  method: string,
  params?: Record<string, string>,
): Promise<FetchResponse> {
  let url = `${API_BASE}/${method}`;
  if (params) {
    const qs = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");
    url += `?${qs}`;
  }
  return fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}
