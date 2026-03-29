// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import type { FetchResponse } from "./clawdroid.d";

const API_BASE = "https://api.spotify.com/v1";

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function spotifyGet(token: string, path: string): Promise<FetchResponse> {
  return fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: authHeaders(token),
  });
}

export async function spotifyPost(token: string, path: string, body?: object): Promise<FetchResponse> {
  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: authHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function spotifyPut(token: string, path: string, body?: object): Promise<FetchResponse> {
  return fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  });
}

/** PUT with a raw string body and custom content type (e.g. image/jpeg for cover art) */
export async function spotifyPutRaw(token: string, path: string, rawBody: string, contentType: string): Promise<FetchResponse> {
  return fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": contentType,
    },
    body: rawBody,
  });
}

export async function spotifyDelete(token: string, path: string, body?: object): Promise<FetchResponse> {
  return fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: authHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  });
}
