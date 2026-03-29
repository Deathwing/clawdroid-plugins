import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
const mockHost = { getSecret: vi.fn(), readFile: vi.fn(), writeFile: vi.fn(), listDirectory: vi.fn(), httpFetch: vi.fn(), log: vi.fn() };
vi.stubGlobal("fetch", mockFetch);
vi.stubGlobal("host", mockHost);
vi.stubGlobal("console", { log: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() });

import { discoverTools, execute, matchEvent, formatLabel, buildConfig } from "../index";
import { parseCredential } from "../api";

function mockCtx(token: string | null = "https://matrix.example.org|syt_test123") {
  return { host: { ...mockHost, getSecret: vi.fn().mockResolvedValue(token) } as any };
}

function jsonResp(data: unknown, status = 200) {
  return { ok: status < 400, status, text: () => JSON.stringify(data), json: () => data };
}

beforeEach(() => vi.clearAllMocks());

// ─── parseCredential ────────────────────────────────────

describe("parseCredential", () => {
  it("parses homeserver|token format", () => {
    const cred = parseCredential("https://matrix.org|syt_abc");
    expect(cred.homeserver).toBe("https://matrix.org");
    expect(cred.token).toBe("syt_abc");
  });

  it("strips trailing slash from homeserver", () => {
    const cred = parseCredential("https://matrix.org/|syt_abc");
    expect(cred.homeserver).toBe("https://matrix.org");
  });

  it("throws on invalid format (no pipe)", () => {
    expect(() => parseCredential("invalid_credential")).toThrow("Invalid credential format");
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
    const result = await execute("matrix_list_rooms", {}, mockCtx(null));
    expect(result).toEqual({ error: true, message: "Matrix not connected. Add your credentials in Settings first." });
  });

  it("returns error for invalid credential format", async () => {
    const result = await execute("matrix_list_rooms", {}, mockCtx("no_pipe_here"));
    expect(result).toHaveProperty("error", true);
    expect((result as any).message).toContain("Invalid credential format");
  });

  it("returns error for unknown tool", async () => {
    const result = await execute("matrix_nonexistent", {}, mockCtx());
    expect(result).toEqual({ error: true, message: "Unknown Matrix tool: matrix_nonexistent" });
  });

  it("dispatches matrix_list_rooms", async () => {
    mockFetch.mockResolvedValue(jsonResp({ joined_rooms: ["!room1:matrix.org", "!room2:matrix.org"] }));
    const result = await execute("matrix_list_rooms", {}, mockCtx());
    expect((result as any).message).toContain("!room1:matrix.org");
  });

  it("dispatches matrix_send_message", async () => {
    mockFetch.mockResolvedValue(jsonResp({ event_id: "$ev123" }));
    const result = await execute("matrix_send_message", { room_id: "!room:m.org", text: "Hello" }, mockCtx());
    expect((result as any).message).toContain("$ev123");
  });

  it("dispatches matrix_read_room", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({ chunk: [{ type: "m.room.message", sender: "@bob:m.org", content: { body: "Hi", msgtype: "m.text" }, event_id: "$e1", origin_server_ts: 1700000000000 }] }),
    );
    const result = await execute("matrix_read_room", { room_id: "!room:m.org", limit: 5 }, mockCtx());
    expect((result as any).message).toContain("Hi");
  });

  it("dispatches matrix_join_room", async () => {
    mockFetch.mockResolvedValue(jsonResp({ room_id: "!room:m.org" }));
    const result = await execute("matrix_join_room", { room_id_or_alias: "#general:m.org" }, mockCtx());
    expect((result as any).message).toBeDefined();
  });

  it("dispatches matrix_get_profile", async () => {
    mockFetch.mockResolvedValue(jsonResp({ displayname: "Bob", avatar_url: "mxc://..." }));
    const result = await execute("matrix_get_profile", { user_id: "@bob:m.org" }, mockCtx());
    expect((result as any).message).toContain("Bob");
  });
});

// ─── matchEvent ─────────────────────────────────────────

describe("matchEvent", () => {
  it("returns event when no room_id filter", () => {
    const event = { room_id: "!room:m.org", sender: "@bob:m.org", body: "Hi" };
    expect(matchEvent("matrix_message", {}, event)).toEqual(event);
  });

  it("returns event when room_id filter matches", () => {
    const event = { room_id: "!room:m.org", sender: "@bob:m.org", body: "Hi" };
    expect(matchEvent("matrix_message", { room_id: "!room:m.org" }, event)).toEqual(event);
  });

  it("returns null when room_id filter doesn't match", () => {
    const event = { room_id: "!other:m.org", sender: "@bob:m.org", body: "Hi" };
    expect(matchEvent("matrix_message", { room_id: "!room:m.org" }, event)).toBeNull();
  });
});

// ─── formatLabel ────────────────────────────────────────

describe("formatLabel", () => {
  it("formats with room_id", () => {
    expect(formatLabel("matrix_message", { room_id: "!room:m.org" })).toBe("New message in !room:m.org");
  });

  it("formats without room_id", () => {
    expect(formatLabel("matrix_message", {})).toBe("New Matrix message");
  });
});

// ─── buildConfig ────────────────────────────────────────

describe("buildConfig", () => {
  it("returns empty config when no input", () => {
    expect(buildConfig("matrix_message", {})).toEqual({});
  });

  it("includes room_id when provided", () => {
    expect(buildConfig("matrix_message", { room_id: "!room:m.org" })).toEqual({ room_id: "!room:m.org" });
  });
});
