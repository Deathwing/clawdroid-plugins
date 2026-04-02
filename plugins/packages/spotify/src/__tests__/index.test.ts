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
  it("returns structured error when no token", async () => {
    const result = await execute("spotify_search", {}, mockCtx(null));
    expect(result).toMatchObject({
      error: true,
      message: "Spotify not connected. Connect in Settings → Plugins → Spotify first.",
      summary: "Spotify connection required",
    });
    expect((result as any).blocks[0]).toEqual({
      type: "status",
      message: "Spotify not connected. Connect in Settings → Plugins → Spotify first.",
      isSuccess: false,
    });
  });

  it("returns structured error for unknown tool", async () => {
    const result = await execute("spotify_nonexistent", {}, mockCtx());
    expect(result).toMatchObject({
      error: true,
      message: "Unknown Spotify tool: spotify_nonexistent",
      summary: "Unsupported Spotify tool",
    });
  });

  // Player tools
  it("dispatches spotify_get_playback with rich blocks", async () => {
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
    expect(result).toMatchObject({ summary: "Playing Test Song" });
    expect((result as any).message).toContain("Test Song");
    expect((result as any).message).toContain("Artist1");
    expect((result as any).blocks[0]).toMatchObject({ type: "status", isSuccess: true });
    expect((result as any).blocks[1]).toMatchObject({ type: "table" });
  });

  it("dispatches spotify_get_playback with no active session", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204, text: () => "", json: () => ({}) });
    const result = await execute("spotify_get_playback", {}, mockCtx());
    expect(result).toMatchObject({ summary: "No active playback" });
    expect((result as any).message).toContain("No active playback");
    expect((result as any).blocks[0]).toMatchObject({ type: "status", isSuccess: true });
  });

  it("dispatches spotify_play", async () => {
    mockFetch.mockResolvedValue(jsonResp({}, 204));
    const result = await execute("spotify_play", {}, mockCtx());
    expect(result).toMatchObject({ summary: "Playback started" });
    expect((result as any).message).toContain("Playback started");
    expect((result as any).blocks[0]).toMatchObject({ type: "status", isSuccess: true });
  });

  it("dispatches spotify_pause", async () => {
    mockFetch.mockResolvedValue(jsonResp({}, 204));
    const result = await execute("spotify_pause", {}, mockCtx());
    expect(result).toMatchObject({ summary: "Playback paused" });
    expect((result as any).message).toContain("Playback paused");
  });

  it("dispatches spotify_next", async () => {
    mockFetch.mockResolvedValue(jsonResp({}, 204));
    const result = await execute("spotify_next", {}, mockCtx());
    expect(result).toMatchObject({ summary: "Skipped forward" });
  });

  it("dispatches spotify_previous", async () => {
    mockFetch.mockResolvedValue(jsonResp({}, 204));
    const result = await execute("spotify_previous", {}, mockCtx());
    expect(result).toMatchObject({ summary: "Skipped backward" });
  });

  // Search
  it("dispatches spotify_search with tables", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({
        tracks: { total: 1, items: [{ id: "t1", name: "Song", artists: [{ id: "a1", name: "A" }], album: { id: "al1", name: "AL" }, uri: "u:1", duration_ms: 200000 }] },
        artists: { total: 0, items: [] },
        albums: { total: 0, items: [] },
        playlists: { total: 0, items: [] },
      }),
    );
    const result = await execute("spotify_search", { query: "test", type: "track" }, mockCtx());
    expect(result).toMatchObject({ summary: '1 result for "test"' });
    expect((result as any).message).toContain("Song");
    expect((result as any).blocks.map((block: any) => block.type)).toEqual(["status", "text", "table"]);
  });

  // Playlists
  it("dispatches spotify_list_playlists with a summary table", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({ total: 1, items: [{ name: "My Playlist", id: "p1", tracks: { total: 10 }, public: true, owner: { display_name: "Me" }, description: null }] }),
    );
    const result = await execute("spotify_list_playlists", { limit: 5 }, mockCtx());
    expect(result).toMatchObject({ summary: "1 playlist found" });
    expect((result as any).message).toContain("My Playlist");
    expect((result as any).blocks[1]).toMatchObject({ type: "table" });
  });

  it("dispatches spotify_create_playlist via the current-user shortcut endpoint", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({
        id: "p2",
        name: "New Playlist",
        public: false,
        uri: "spotify:playlist:p2",
        description: null,
        owner: { display_name: "Me" },
        items: { total: 0 },
      }),
    );

    const result = await execute("spotify_create_playlist", { name: "New Playlist" }, mockCtx());

    expect(mockFetch.mock.calls[0][0]).toBe("https://api.spotify.com/v1/me/playlists");
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
      name: "New Playlist",
      description: "",
      public: false,
    });
    expect(result).toMatchObject({ summary: "Created New Playlist" });
    expect((result as any).message).toContain("New Playlist");
  });

  it("dispatches spotify_remove_from_playlist with Spotify's items payload", async () => {
    mockFetch.mockResolvedValue(jsonResp({}, 200));
    const result = await execute(
      "spotify_remove_from_playlist",
      { playlist_id: "p1", uris: "spotify:track:1,spotify:track:2" },
      mockCtx(),
    );

    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
      items: [{ uri: "spotify:track:1" }, { uri: "spotify:track:2" }],
    });
    expect(result).toMatchObject({ summary: "Removed 2 tracks" });
  });

  // Library
  it("dispatches spotify_get_saved_tracks with a table", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({ items: [{ added_at: "2024-01-01", track: { id: "t2", name: "Saved Song", artists: [{ id: "x1", name: "X" }], album: { id: "a2", name: "Y" }, uri: "u:2", duration_ms: 180000 } }], total: 1 }),
    );
    const result = await execute("spotify_get_saved_tracks", { limit: 5 }, mockCtx());
    expect(result).toMatchObject({ summary: "1 saved track" });
    expect((result as any).message).toContain("Saved Song");
    expect((result as any).blocks[1]).toMatchObject({ type: "table" });
  });

  it("dispatches spotify_save_tracks with preview blocks", async () => {
    mockFetch.mockResolvedValue(jsonResp({}, 200));
    const result = await execute("spotify_save_tracks", { track_ids: "id1,id2" }, mockCtx());
    expect(result).toMatchObject({ summary: "Saved 2 tracks" });
    expect((result as any).blocks.map((block: any) => block.type)).toEqual(["status", "text", "table"]);
  });

  // Browse
  it("dispatches spotify_get_track with key details", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({ id: "t3", name: "Single", artists: [{ id: "b1", name: "B" }], album: { id: "alb1", name: "Alb" }, duration_ms: 200000, uri: "u:3", popularity: 80 }),
    );
    const result = await execute("spotify_get_track", { track_id: "123" }, mockCtx());
    expect(result).toMatchObject({ summary: "Track Single" });
    expect((result as any).message).toContain("Single");
    expect((result as any).blocks[1]).toMatchObject({ type: "table" });
  });

  it("dispatches spotify_get_artist with key details", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({ id: "a9", name: "ArtistZ", followers: { total: 1000 }, genres: ["pop"], popularity: 90, external_urls: { spotify: "url" } }),
    );
    const result = await execute("spotify_get_artist", { artist_id: "a1" }, mockCtx());
    expect(result).toMatchObject({ summary: "Artist ArtistZ" });
    expect((result as any).message).toContain("ArtistZ");
    expect((result as any).blocks[1]).toMatchObject({ type: "table" });
  });

  // Error wrapping
  it("catches errors from tool functions as structured results", async () => {
    mockFetch.mockRejectedValue(new Error("Network failure"));
    const result = await execute("spotify_get_playback", {}, mockCtx());
    expect(result).toMatchObject({ error: true, message: "Network failure", summary: "Spotify request failed" });
    expect((result as any).blocks[0]).toMatchObject({ type: "status", isSuccess: false });
  });
});
