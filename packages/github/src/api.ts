// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import type { FetchResponse } from "../../../clawdroid.d";

const API_BASE = "https://api.github.com";

const DEFAULT_HEADERS: Record<string, string> = {
  Accept: "application/vnd.github.v3+json",
  "User-Agent": "ClawDroid/1.0",
};

function authHeaders(token: string): Record<string, string> {
  return { ...DEFAULT_HEADERS, Authorization: `Bearer ${token}` };
}

export async function githubGet(token: string, path: string): Promise<FetchResponse> {
  return fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: authHeaders(token),
  });
}

export async function githubPost(token: string, path: string, body: object): Promise<FetchResponse> {
  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function githubDelete(token: string, path: string): Promise<FetchResponse> {
  return fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}
