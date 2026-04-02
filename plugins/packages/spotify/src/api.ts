// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import type { FetchResponse } from "../../../quickjs.d";

const API_BASE = "https://api.spotify.com/v1";

type SpotifyApiErrorPayload = {
  error?: {
    message?: string;
  } | string;
  message?: string;
};

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function buildErrorMessage(response: FetchResponse, action: string): string {
  const prefix = `${action} failed`;
  const rawText = response.text().trim();
  if (!rawText) {
    return `${prefix} (HTTP ${response.status}).`;
  }

  try {
    const data = JSON.parse(rawText) as SpotifyApiErrorPayload;
    if (typeof data.error === "string" && data.error.trim()) {
      return `${prefix}: ${data.error}`;
    }
    if (data.error && typeof data.error === "object" && typeof data.error.message === "string" && data.error.message.trim()) {
      return `${prefix}: ${data.error.message}`;
    }
    if (typeof data.message === "string" && data.message.trim()) {
      return `${prefix}: ${data.message}`;
    }
  } catch {
    // Fall back to the raw body below.
  }

  return `${prefix}: ${rawText}`;
}

export function ensureOk(response: FetchResponse, action: string): FetchResponse {
  if (!response.ok) {
    throw new Error(buildErrorMessage(response, action));
  }
  return response;
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
