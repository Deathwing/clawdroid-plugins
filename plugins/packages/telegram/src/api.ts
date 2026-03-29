// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import type { FetchResponse } from "../../../quickjs.d";

/**
 * Telegram Bot API helper.
 * All methods go through POST https://api.telegram.org/bot{token}/{method}
 */

function apiUrl(token: string, method: string): string {
  return `https://api.telegram.org/bot${token}/${method}`;
}

export async function telegramPost(
  token: string,
  method: string,
  params?: Record<string, unknown>,
): Promise<FetchResponse> {
  return fetch(apiUrl(token, method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: params ? JSON.stringify(params) : undefined,
  });
}
