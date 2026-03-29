// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

declare const host: {
  httpFetch(
    url: string,
    method: string,
    headersJson: string,
    body?: string | null,
  ): Promise<{ status: number; body: string; json(): any }>;
  getSecret(key: string): Promise<string | null>;
  log(level: string, message: string): void;
};

export const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

export async function graphGet(token: string, path: string): Promise<any> {
  const resp = await host.httpFetch(
    `${GRAPH_BASE}${path}`,
    "GET",
    JSON.stringify({ Authorization: `Bearer ${token}` }),
    null,
  );
  if (resp.status >= 400) {
    throw new Error(`Graph API ${resp.status}: ${resp.body}`);
  }
  return resp.json();
}

export async function graphPost(
  token: string,
  path: string,
  body: object,
): Promise<any> {
  const resp = await host.httpFetch(
    `${GRAPH_BASE}${path}`,
    "POST",
    JSON.stringify({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    JSON.stringify(body),
  );
  if (resp.status >= 400) {
    throw new Error(`Graph API ${resp.status}: ${resp.body}`);
  }
  return resp.json();
}
