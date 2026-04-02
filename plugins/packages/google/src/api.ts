import type { FetchResponse } from "../../../quickjs.d";

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function parseErrorMessage(body: string): string | undefined {
  try {
    const parsed = JSON.parse(body) as {
      error?: { message?: string; errors?: Array<{ message?: string }> };
      message?: string;
      error_description?: string;
    };
    return (
      parsed.error?.message
      || parsed.error?.errors?.[0]?.message
      || parsed.message
      || parsed.error_description
    );
  } catch (_err) {
    return undefined;
  }
}

function ensureOk(response: FetchResponse): FetchResponse {
  if (response.ok) return response;

  const body = response.text().trim();
  if (!body) {
    throw new Error(`Google API ${response.status}`);
  }

  const parsedMessage = parseErrorMessage(body);
  if (parsedMessage) {
    throw new Error(`Google API ${response.status}: ${parsedMessage}`);
  }

  throw new Error(`Google API ${response.status}: ${body}`);
}

function parseJsonBody(response: FetchResponse): any {
  const body = response.text().trim();
  return body ? JSON.parse(body) : {};
}

export function buildQuery(params: Record<string, string | number | undefined>): string {
  const pairs: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || String(value).length === 0) continue;
    pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return pairs.join("&");
}

export async function googleGetJson(token: string, url: string): Promise<any> {
  const response = ensureOk(await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  }));
  return parseJsonBody(response);
}

export async function googlePostJson(token: string, url: string, body: Record<string, unknown>): Promise<any> {
  const response = ensureOk(await fetch(url, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  }));
  return parseJsonBody(response);
}