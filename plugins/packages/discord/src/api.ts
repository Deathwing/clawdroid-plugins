import type { FetchResponse } from "../../../../quickjs.d";

const DISCORD_BASE = "https://discord.com/api/v10";

export async function discordGet(
  token: string,
  path: string,
): Promise<FetchResponse> {
  return fetch(`${DISCORD_BASE}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bot ${token}`,
      "User-Agent": "ClawDroid (https://clawdroid.com, 1.0)",
    },
  });
}

export async function discordPost(
  token: string,
  path: string,
  body: Record<string, unknown>,
): Promise<FetchResponse> {
  return fetch(`${DISCORD_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${token}`,
      "User-Agent": "ClawDroid (https://clawdroid.com, 1.0)",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function discordPut(
  token: string,
  path: string,
): Promise<FetchResponse> {
  return fetch(`${DISCORD_BASE}${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${token}`,
      "User-Agent": "ClawDroid (https://clawdroid.com, 1.0)",
      "Content-Type": "application/json",
    },
    body: "",
  });
}
