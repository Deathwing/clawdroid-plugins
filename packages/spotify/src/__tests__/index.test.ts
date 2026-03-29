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

function mockCtx(token: string | null = "spotify-test-token") {
  return { host: { ...mockHost, getSecret: vi.fn().mockResolvedValue(token) } as any };
}

function jsonResp(data: unknown, status = 200) {
  return { ok: status < 400, status, text: () => JSON.stringify(data), json: () => data };
}

beforeEach(() => vi.clearAllMocks());

// ─── params ─────────────────────────────────────────────

describe("params", () => {
  it("required() returns value when present", () => {
    expect(required({ name: "test" }, "name")).toBe("test");
  });

  it("required() throws when missing", () => {
    expect(() => required({}, "name")).toThrow("Missing 'name' parameter");
  });

  it("required() throws on empty string", () => {
    expect(() => required({ name: "" }, "name")).toThrow("Missing 'name' parameter");
  });

  it("optional() returns value when present", () => {
    expect(optional({ limit: 5 }, "limit", 10)).toBe(5);
  });

  it("optional() returns default when missing", () => {
    expect(optional({}, "limit", 10)).toBe(10);
  });
});

// ─── discoverTools ──────────────────────────────────────

describe("discoverTools", () => {
  it("returns empty array", () => {
    expect(discoverTools()).toEqual([]);
  });
});

// ─── execute ────────────────────────────────────────────

describe("execute", () => {
  it("returns error when no token", async () => {
    const result = await execute("spotify_search", {}, mockCtx(null));
    expect(result).toEqual({ error: true, message: "Spotify not connected. Connect in Settings → Plugins → Spotify first." });
  });

  it("returns error for unknown tool", async () => {
    const result = await execute("spotify_nonexistent", {}, mockCtx());
    expect(result).toEqual({ error: true, message: "Unknown Spotify tool: spotify_nonexistent" });
  });

  // Player tools
  it("dispatches spotify_get_playback", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({
        is_playing: true,
        progress_ms: 60000,
        item: {
          name: "Test Song",
          artists: [{ name: "Artist1" }],
          album: { name: "Test Album" },
          duration_ms: 240000,
          uri: "spotify:track:123",
        },
        device: { name: "Phone", type: "smartphone", volume_percent: 80 },
        shuffle_state: false,
        repeat_state: "off",
      }),
    );
    const result = await execute("spotify_get_playback", {}, mockCtx());
    expect((result as any).message).toContain("Test Song");
    expect((result as any).message).toContain("Artist1");
  });

  it("dispatches spotify_get_playback with no active session", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204, text: () => "", json: () => ({}) });
    const result = await execute("spotify_get_playback", {}, mockCtx());
    expect((result as any).message).toContain("No active playback");
  });

  it("dispatches spotify_play", async () => {
    mockFetch.mockResolvedValue(jsonResp({}, 204));
    const result = await execute("spotify_play", {}, mockCtx());
    expect((result as any).message).toContain("Playback started");
  });

  it("dispatches spotify_pause", async () => {
    mockFetch.mockResolvedValue(jsonResp({}, 204));
    const result = await execute("spotify_pause", {}, mockCtx());
    expect((result as any).message).toBeDefined();
  });

  it("dispatches spotify_next", async () => {
    mockFetch.mockResolvedValue(jsonResp({}, 204));
    const result = await execute("spotify_next", {}, mockCtx());
    expect((result as any).message).toBeDefined();
  });

  it("dispatches spotify_previous", async () => {
    mockFetch.mockResolvedValue(jsonResp({}, 204));
    const result = await execute("spotify_previous", {}, mockCtx());
    expect((result as any).message).toBeDefined();
  });

  // Search
  it("dispatches spotify_search", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({
        tracks: { items: [{ name: "Song", artists: [{ name: "A" }], album: { name: "AL" }, uri: "u:1", duration_ms: 200000 }] },
        artists: { items: [] },
        albums: { items: [] },
        playlists: { items: [] },
      }),
    );
    const result = await execute("spotify_search", { query: "test", type: "track" }, mockCtx());
    expect((result as any).message).toContain("Song");
  });

  // Playlists
  it("dispatches spotify_list_playlists", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({ items: [{ name: "My Playlist", id: "p1", tracks: { total: 10 }, public: true, owner: { display_name: "Me" } }] }),
    );
    const result = await execute("spotify_list_playlists", { limit: 5 }, mockCtx());
    expect((result as any).message).toContain("My Playlist");
  });

  it("dispatches spotify_create_playlist", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({ id: "p2", name: "New Playlist" }),
    );
    const result = await execute("spotify_create_playlist", { name: "New Playlist" }, mockCtx());
    expect((result as any).message).toContain("New Playlist");
  });

  // Library
  it("dispatches spotify_get_saved_tracks", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({ items: [{ added_at: "2024-01-01", track: { name: "Saved Song", artists: [{ name: "X" }], album: { name: "Y" }, uri: "u:2", duration_ms: 180000 } }], total: 1 }),
    );
    const result = await execute("spotify_get_saved_tracks", { limit: 5 }, mockCtx());
    expect((result as any).message).toContain("Saved Song");
  });

  it("dispatches spotify_save_tracks", async () => {
    mockFetch.mockResolvedValue(jsonResp({}, 200));
    const result = await execute("spotify_save_tracks", { track_ids: "id1,id2" }, mockCtx());
    expect((result as any).message).toBeDefined();
  });

  // Browse
  it("dispatches spotify_get_track", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({ name: "Single", artists: [{ name: "B" }], album: { name: "Alb" }, duration_ms: 200000, uri: "u:3", popularity: 80 }),
    );
    const result = await execute("spotify_get_track", { track_id: "123" }, mockCtx());
    expect((result as any).message).toContain("Single");
  });

  it("dispatches spotify_get_artist", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({ name: "ArtistZ", followers: { total: 1000 }, genres: ["pop"], popularity: 90, external_urls: { spotify: "url" } }),
    );
    const result = await execute("spotify_get_artist", { artist_id: "a1" }, mockCtx());
    expect((result as any).message).toContain("ArtistZ");
  });

  // Error wrapping
  it("catches errors from tool functions", async () => {
    mockFetch.mockRejectedValue(new Error("Network failure"));
    const result = await execute("spotify_get_playback", {}, mockCtx());
    expect(result).toEqual({ error: true, message: "Network failure" });
  });
});
