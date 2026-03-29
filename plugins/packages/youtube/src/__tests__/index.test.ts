// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
const mockHost = { getSecret: vi.fn(), readFile: vi.fn(), writeFile: vi.fn(), listDirectory: vi.fn(), httpFetch: vi.fn(), log: vi.fn() };
vi.stubGlobal("fetch", mockFetch);
vi.stubGlobal("host", mockHost);
vi.stubGlobal("console", { log: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() });

import { discoverTools, execute } from "../index";
import { required, optional } from "../params";

function mockCtx(token: string | null = "yt-test-token") {
  return { host: { ...mockHost, getSecret: vi.fn().mockResolvedValue(token) } as any };
}

function jsonResp(data: unknown, status = 200) {
  return { ok: status < 400, status, text: () => JSON.stringify(data), json: () => data };
}

beforeEach(() => vi.clearAllMocks());

// ─── params ─────────────────────────────────────────────

describe("params", () => {
  it("required() returns value when present", () => {
    expect(required({ q: "cats" }, "q")).toBe("cats");
  });

  it("required() throws when missing", () => {
    expect(() => required({}, "q")).toThrow("Missing 'q' parameter");
  });

  it("required() throws on empty string", () => {
    expect(() => required({ q: "" }, "q")).toThrow("Missing 'q' parameter");
  });

  it("required() throws on null", () => {
    expect(() => required({ q: null }, "q")).toThrow("Missing 'q' parameter");
  });

  it("optional() returns value when present", () => {
    expect(optional({ max_results: 5 }, "max_results", 10)).toBe(5);
  });

  it("optional() returns default when missing", () => {
    expect(optional({}, "max_results", 10)).toBe(10);
  });

  it("optional() returns default for null", () => {
    expect(optional({ max_results: null }, "max_results", 10)).toBe(10);
  });

  it("optional() returns default for empty string", () => {
    expect(optional({ max_results: "" }, "max_results", 10)).toBe(10);
  });
});

// ─── discoverTools ──────────────────────────────────────

describe("discoverTools", () => {
  it("returns empty array (tools declared in manifest.json)", () => {
    expect(discoverTools()).toEqual([]);
  });
});

// ─── execute — auth guard ────────────────────────────────

describe("execute", () => {
  it("returns error when no token", async () => {
    const result = await execute("youtube_search", {}, mockCtx(null));
    expect(result).toEqual({
      error: true,
      message: "YouTube not connected. Connect in Settings → Plugins → YouTube first.",
    });
  });

  it("returns error for unknown tool", async () => {
    const result = await execute("youtube_nonexistent", {}, mockCtx());
    expect(result).toEqual({
      error: true,
      message: "Unknown YouTube tool: youtube_nonexistent",
    });
  });

  // ─── youtube_search ──────────────────────────────────

  it("dispatches youtube_search and returns results", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({
        pageInfo: { totalResults: 1 },
        items: [{
          id: { videoId: "abc123" },
          snippet: {
            title: "Test Video",
            channelTitle: "Test Channel",
            publishedAt: "2025-01-01T00:00:00Z",
            description: "A test video description",
          },
        }],
      }),
    );
    const result = await execute("youtube_search", { query: "test" }, mockCtx());
    expect((result as any).message).toContain("Test Video");
    expect((result as any).message).toContain("abc123");
  });

  it("youtube_search returns empty message when no results", async () => {
    mockFetch.mockResolvedValue(jsonResp({ items: [] }));
    const result = await execute("youtube_search", { query: "noresults" }, mockCtx());
    expect((result as any).message).toBe("No results found.");
  });

  it("youtube_search throws when query is missing", async () => {
    const result = await execute("youtube_search", {}, mockCtx());
    expect((result as any).error).toBe(true);
    expect((result as any).message).toContain("Missing 'query' parameter");
  });

  // ─── youtube_get_video ───────────────────────────────

  it("dispatches youtube_get_video and returns video info", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({
        items: [{
          id: "abc123",
          snippet: {
            title: "My Video",
            channelTitle: "My Channel",
            channelId: "UCtest",
            publishedAt: "2025-06-01T00:00:00Z",
            description: "Some description",
          },
          statistics: { viewCount: "1000000", likeCount: "50000", commentCount: "200" },
          contentDetails: { duration: "PT4M30S" },
        }],
      }),
    );
    const result = await execute("youtube_get_video", { video_id: "abc123" }, mockCtx());
    expect((result as any).message).toContain("My Video");
    expect((result as any).message).toContain("4:30");
    expect((result as any).message).toContain("1,000,000");
  });

  it("youtube_get_video returns not-found message for empty items", async () => {
    mockFetch.mockResolvedValue(jsonResp({ items: [] }));
    const result = await execute("youtube_get_video", { video_id: "missing" }, mockCtx());
    expect((result as any).message).toContain("No video found with ID: missing");
  });

  it("youtube_get_video throws when video_id is missing", async () => {
    const result = await execute("youtube_get_video", {}, mockCtx());
    expect((result as any).error).toBe(true);
    expect((result as any).message).toContain("Missing 'video_id' parameter");
  });

  // ─── youtube_rate_video ──────────────────────────────

  it("dispatches youtube_rate_video (like)", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204, text: () => "", json: () => ({}) });
    const result = await execute("youtube_rate_video", { video_id: "abc123", rating: "like" }, mockCtx());
    expect((result as any).message).toContain("Liked video abc123");
  });

  it("dispatches youtube_rate_video (none — remove)", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204, text: () => "", json: () => ({}) });
    const result = await execute("youtube_rate_video", { video_id: "abc123", rating: "none" }, mockCtx());
    expect((result as any).message).toContain("Removed rating from video abc123");
  });

  it("youtube_rate_video returns error for invalid rating", async () => {
    const result = await execute("youtube_rate_video", { video_id: "abc123", rating: "meh" }, mockCtx());
    expect((result as any).error).toBe(true);
    expect((result as any).message).toContain('Invalid rating "meh"');
  });

  // ─── youtube_list_my_playlists ───────────────────────

  it("dispatches youtube_list_my_playlists", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({
        pageInfo: { totalResults: 1 },
        items: [{
          id: "PLtest",
          snippet: { title: "Favourites", description: "" },
          contentDetails: { itemCount: 12 },
          status: { privacyStatus: "private" },
        }],
      }),
    );
    const result = await execute("youtube_list_my_playlists", {}, mockCtx());
    expect((result as any).message).toContain("Favourites");
    expect((result as any).message).toContain("PLtest");
    expect((result as any).message).toContain("12 videos");
  });

  it("youtube_list_my_playlists returns empty message", async () => {
    mockFetch.mockResolvedValue(jsonResp({ items: [] }));
    const result = await execute("youtube_list_my_playlists", {}, mockCtx());
    expect((result as any).message).toBe("No playlists found.");
  });

  // ─── youtube_get_playlist_items ──────────────────────

  it("dispatches youtube_get_playlist_items", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({
        pageInfo: { totalResults: 1 },
        items: [{
          id: "PLItest",
          snippet: {
            title: "Cool Video",
            resourceId: { videoId: "vid001" },
          },
        }],
      }),
    );
    const result = await execute("youtube_get_playlist_items", { playlist_id: "PLtest" }, mockCtx());
    expect((result as any).message).toContain("Cool Video");
    expect((result as any).message).toContain("vid001");
  });

  // ─── youtube_add_to_playlist ─────────────────────────

  it("dispatches youtube_add_to_playlist", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({ id: "PLIadded", snippet: { position: 3 } }),
    );
    const result = await execute("youtube_add_to_playlist", { playlist_id: "PLtest", video_id: "vid001" }, mockCtx());
    expect((result as any).message).toContain("Added video vid001 to playlist PLtest");
  });

  // ─── youtube_create_playlist ─────────────────────────

  it("dispatches youtube_create_playlist", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({ id: "PLnew", snippet: { title: "My New Playlist" }, status: { privacyStatus: "public" } }),
    );
    const result = await execute("youtube_create_playlist", { title: "My New Playlist" }, mockCtx());
    expect((result as any).message).toContain("My New Playlist");
    expect((result as any).message).toContain("PLnew");
  });

  it("youtube_create_playlist returns error for invalid privacy", async () => {
    const result = await execute("youtube_create_playlist", { title: "Test", privacy: "secret" }, mockCtx());
    expect((result as any).error).toBe(true);
    expect((result as any).message).toContain('Invalid privacy "secret"');
  });

  // ─── youtube_remove_from_playlist ────────────────────

  it("dispatches youtube_remove_from_playlist", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204, text: () => "", json: () => ({}) });
    const result = await execute("youtube_remove_from_playlist", { playlist_item_id: "PLItest" }, mockCtx());
    expect((result as any).message).toContain("Removed playlist item PLItest");
  });

  // ─── youtube_get_channel ─────────────────────────────

  it("dispatches youtube_get_channel (by id)", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({
        items: [{
          id: "UCtest",
          snippet: { title: "Test Channel", customUrl: "@testchannel", publishedAt: "2020-01-01T00:00:00Z", description: "" },
          statistics: { subscriberCount: "100000", videoCount: "50", viewCount: "5000000", hiddenSubscriberCount: false },
        }],
      }),
    );
    const result = await execute("youtube_get_channel", { channel_id: "UCtest" }, mockCtx());
    expect((result as any).message).toContain("Test Channel");
    expect((result as any).message).toContain("100,000");
  });

  it("youtube_get_channel returns not-found for missing channel", async () => {
    mockFetch.mockResolvedValue(jsonResp({ items: [] }));
    const result = await execute("youtube_get_channel", { channel_id: "UCmissing" }, mockCtx());
    expect((result as any).message).toContain("No channel found with ID: UCmissing");
  });

  // ─── youtube_list_subscriptions ──────────────────────

  it("dispatches youtube_list_subscriptions", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({
        pageInfo: { totalResults: 1 },
        items: [{
          snippet: {
            title: "Subscribed Channel",
            resourceId: { channelId: "UCsub123" },
          },
        }],
      }),
    );
    const result = await execute("youtube_list_subscriptions", {}, mockCtx());
    expect((result as any).message).toContain("Subscribed Channel");
    expect((result as any).message).toContain("UCsub123");
  });

  it("youtube_list_subscriptions returns empty message", async () => {
    mockFetch.mockResolvedValue(jsonResp({ items: [] }));
    const result = await execute("youtube_list_subscriptions", {}, mockCtx());
    expect((result as any).message).toBe("No subscriptions found.");
  });
});
