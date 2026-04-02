// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import type { FetchResponse } from "../../../quickjs.d";

const API_BASE = "https://www.googleapis.com/youtube/v3";

function ensureOk(resp: FetchResponse): FetchResponse {
  if (resp.ok) return resp;

  const body = resp.text().trim();
  if (!body) {
    throw new Error(`YouTube API ${resp.status}`);
  }

  let parsedMessage: string | undefined;
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string }; message?: string };
    parsedMessage = parsed.error?.message || parsed.message;
  } catch (_err) {
    // Fall through to the raw body error below.
  }

  if (parsedMessage) {
    throw new Error(`YouTube API ${resp.status}: ${parsedMessage}`);
  }

  throw new Error(`YouTube API ${resp.status}: ${body}`);
}

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function ytGet(token: string, path: string): Promise<FetchResponse> {
  return ensureOk(await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: authHeaders(token),
  }));
}

export async function ytPost(token: string, path: string, body?: object): Promise<FetchResponse> {
  return ensureOk(await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: authHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  }));
}

export async function ytDelete(token: string, path: string): Promise<FetchResponse> {
  return ensureOk(await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: authHeaders(token),
  }));
}
