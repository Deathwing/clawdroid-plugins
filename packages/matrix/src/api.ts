// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import type { FetchResponse } from "../../../clawdroid.d";

/**
 * Parse a credential string in the format "homeserver|access_token".
 */
export function parseCredential(raw: string): { homeserver: string; token: string } {
  const idx = raw.indexOf("|");
  if (idx === -1) {
    throw new Error("Invalid credential format. Expected: homeserver_url|access_token");
  }
  let homeserver = raw.substring(0, idx).trim();
  // Strip trailing slash
  if (homeserver.endsWith("/")) homeserver = homeserver.slice(0, -1);
  const token = raw.substring(idx + 1).trim();
  return { homeserver, token };
}

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function apiUrl(homeserver: string, path: string): string {
  return `${homeserver}/_matrix/client/v3${path}`;
}

export async function matrixGet(
  homeserver: string,
  token: string,
  path: string,
): Promise<FetchResponse> {
  return fetch(apiUrl(homeserver, path), {
    method: "GET",
    headers: authHeaders(token),
  });
}

export async function matrixPut(
  homeserver: string,
  token: string,
  path: string,
  body: Record<string, unknown>,
): Promise<FetchResponse> {
  return fetch(apiUrl(homeserver, path), {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
}

export async function matrixPost(
  homeserver: string,
  token: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<FetchResponse> {
  return fetch(apiUrl(homeserver, path), {
    method: "POST",
    headers: authHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  });
}
