// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
const mockHost = { getSecret: vi.fn(), readFile: vi.fn(), writeFile: vi.fn(), listDirectory: vi.fn(), httpFetch: vi.fn(), log: vi.fn() };
vi.stubGlobal("fetch", mockFetch);
vi.stubGlobal("host", mockHost);
vi.stubGlobal("console", { log: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() });

import { discoverTools, execute } from "../index";

function mockCtx(token: string | null = "ig_test123") {
  return { host: { ...mockHost, getSecret: vi.fn().mockResolvedValue(token) } as any };
}

function jsonResp(data: unknown, status = 200) {
  return { ok: status < 400, status, text: () => JSON.stringify(data), json: () => data };
}

beforeEach(() => vi.clearAllMocks());

describe("discoverTools", () => {
  it("returns empty array", () => {
    expect(discoverTools()).toEqual([]);
  });
});

describe("execute", () => {
  it("returns error when no token", async () => {
    const result = await execute("instagram_get_profile", {}, mockCtx(null));
    expect(result).toEqual({ error: true, message: "Instagram not connected. Sign in via Plugin settings." });
  });

  it("returns error for unknown tool", async () => {
    const result = await execute("instagram_nonexistent", {}, mockCtx());
    expect(result).toEqual({ error: true, message: "Unknown Instagram tool: instagram_nonexistent" });
  });

  it("dispatches instagram_get_profile", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({ id: "123", username: "testuser", name: "Test User", followers_count: 100, follows_count: 50, media_count: 10 }),
    );
    const result = await execute("instagram_get_profile", {}, mockCtx());
    expect((result as any).message).toContain("testuser");
  });

  it("dispatches instagram_list_media", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResp({ id: "123" })) // getUserId
      .mockResolvedValueOnce(jsonResp({ data: [{ id: "m1", caption: "Hello", media_type: "IMAGE", timestamp: "2024-01-01" }] }));
    const result = await execute("instagram_list_media", { limit: 5 }, mockCtx());
    expect((result as any).message).toContain("Hello");
  });

  it("dispatches instagram_get_media", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({ id: "m1", caption: "Photo", media_type: "IMAGE", like_count: 42, comments_count: 5 }),
    );
    const result = await execute("instagram_get_media", { media_id: "m1" }, mockCtx());
    expect((result as any).message).toContain("Photo");
  });

  it("dispatches instagram_list_comments", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({ data: [{ id: "c1", text: "Nice!", username: "fan", timestamp: "2024-01-01" }] }),
    );
    const result = await execute("instagram_list_comments", { media_id: "m1" }, mockCtx());
    expect((result as any).message).toContain("Nice!");
  });

  it("dispatches instagram_get_insights", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({ data: [{ name: "impressions", values: [{ value: 100 }] }] }),
    );
    const result = await execute("instagram_get_insights", { media_id: "m1" }, mockCtx());
    expect((result as any).message).toContain("impressions");
  });
});
