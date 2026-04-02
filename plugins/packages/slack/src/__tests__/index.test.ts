import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
const mockHost = { getSecret: vi.fn(), readFile: vi.fn(), writeFile: vi.fn(), listDirectory: vi.fn(), httpFetch: vi.fn(), log: vi.fn() };
vi.stubGlobal("fetch", mockFetch);
vi.stubGlobal("host", mockHost);
vi.stubGlobal("console", { log: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() });

import { discoverTools, execute, checkTrigger, matchEvent, formatLabel, buildConfig } from "../index";

function mockCtx(token: string | null = "xoxb-test123") {
  return { host: { ...mockHost, getSecret: vi.fn().mockResolvedValue(token) } as any };
}

function jsonResp(data: unknown, status = 200) {
  return { ok: status < 400, status, text: () => JSON.stringify(data), json: () => data };
}

beforeEach(() => vi.clearAllMocks());

// ─── discoverTools ──────────────────────────────────────

describe("discoverTools", () => {
  it("returns empty array", () => {
    expect(discoverTools()).toEqual([]);
  });
});

// ─── execute ────────────────────────────────────────────

describe("execute", () => {
  it("returns structured error when no token", async () => {
    const result = await execute("slack_list_channels", {}, mockCtx(null));
    expect(result).toMatchObject({
      error: true,
      message: "Slack not connected. Add your bot token in Settings first.",
      summary: "Slack connection required",
    });
  });

  it("returns structured error for unknown tool", async () => {
    const result = await execute("slack_nonexistent", {}, mockCtx());
    expect(result).toMatchObject({
      error: true,
      message: "Unknown Slack tool: slack_nonexistent",
      summary: "Unsupported Slack tool",
    });
  });

  it("dispatches slack_list_channels", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({ ok: true, channels: [{ id: "C1", name: "general", is_private: false, num_members: 10, topic: { value: "General" } }] }),
    );
    const result = await execute("slack_list_channels", { limit: 10 }, mockCtx());
    expect((result as any).message).toContain("general");
    expect((result as any).summary).toBe("1 channel found");
    expect((result as any).blocks[1]).toMatchObject({ type: "table" });
  });

  it("dispatches slack_get_channel_info", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({
        ok: true,
        channel: {
          id: "C1",
          name: "general",
          is_private: false,
          num_members: 10,
          created: 1710000000,
          topic: { value: "General team chat" },
          purpose: { value: "Coordinate day-to-day work" },
        },
      }),
    );
    const result = await execute("slack_get_channel_info", { channel: "C1" }, mockCtx());
    expect((result as any).message).toContain("general");
    expect((result as any).summary).toBe("Channel general");
    expect((result as any).blocks[1]).toMatchObject({ type: "table" });
  });

  it("dispatches slack_send_message", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({ ok: true, ts: "1234567890.123456" }),
    );
    const result = await execute("slack_send_message", { channel: "C1", text: "Hello" }, mockCtx());
    expect((result as any).message).toContain("1234567890");
    expect((result as any).summary).toBe("Message sent");
    expect((result as any).blocks[0]).toMatchObject({ type: "status", isSuccess: true });
  });

  it("dispatches slack_read_channel", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({ ok: true, messages: [{ user: "U1", text: "Hi there", ts: "123.456" }] }),
    );
    const result = await execute("slack_read_channel", { channel: "C1", limit: 5 }, mockCtx());
    expect((result as any).message).toContain("Hi there");
    expect((result as any).summary).toBe("1 message found in C1");
    expect((result as any).blocks[1]).toMatchObject({ type: "table" });
  });

  it("dispatches slack_list_users", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({ ok: true, members: [{ id: "U1", name: "bob", real_name: "Bob Smith", is_bot: false }] }),
    );
    const result = await execute("slack_list_users", { limit: 10 }, mockCtx());
    expect((result as any).message).toContain("bob");
    expect((result as any).summary).toBe("1 user found");
    expect((result as any).blocks[1]).toMatchObject({ type: "table" });
  });

  it("dispatches slack_get_user", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({ ok: true, user: { id: "U1", name: "alice", real_name: "Alice", profile: { email: "alice@test.com", title: "Dev" } } }),
    );
    const result = await execute("slack_get_user", { user_id: "U1" }, mockCtx());
    expect((result as any).message).toContain("alice");
    expect((result as any).summary).toBe("User alice");
    expect((result as any).blocks[1]).toMatchObject({ type: "table" });
  });

  it("dispatches slack_auth_test", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({ ok: true, team: "TestTeam", user: "botuser", url: "https://testteam.slack.com" }),
    );
    const result = await execute("slack_auth_test", {}, mockCtx());
    expect((result as any).message).toContain("TestTeam");
    expect((result as any).summary).toBe("Slack workspace TestTeam");
    expect((result as any).blocks[1]).toMatchObject({ type: "table" });
  });

  it("dispatches slack_add_reaction", async () => {
    mockFetch.mockResolvedValue(jsonResp({ ok: true }));
    const result = await execute("slack_add_reaction", { channel: "C1", timestamp: "123.456", emoji: "thumbsup" }, mockCtx());
    expect((result as any).summary).toBe("Reaction added");
    expect((result as any).blocks[0]).toMatchObject({ type: "status", isSuccess: true });
  });
});

// ─── checkTrigger ──────────────────────────────────────

describe("checkTrigger", () => {
  it("uses the passed plugin context for slack polling", async () => {
    const ctx = mockCtx();
    mockHost.getSecret.mockResolvedValue(null);
    mockFetch.mockResolvedValue(
      jsonResp({
        ok: true,
        messages: [
          { user: "U1", text: "Hello from Slack", ts: "123.456" },
        ],
      }),
    );

    const result = await checkTrigger(
      "slack_message",
      { channel: "general" },
      {},
      ctx as any,
    );

    expect(result.events).toEqual([
      {
        channel: "general",
        user: "U1",
        text: "Hello from Slack",
        ts: "123.456",
      },
    ]);
    expect(result.state).toMatchObject({ latest_ts: "123.456" });
    expect((ctx as any).host.getSecret).toHaveBeenCalledWith("token");
    expect(mockHost.getSecret).not.toHaveBeenCalled();
  });
});

// ─── matchEvent ─────────────────────────────────────────

describe("matchEvent", () => {
  it("always returns event data", () => {
    const event = { channel: "C1", user: "U1", text: "Hello", ts: "123" };
    expect(matchEvent("slack_message", {}, event)).toEqual(event);
  });

  it("returns event even with config", () => {
    const event = { channel: "C1", user: "U1", text: "Hello", ts: "123" };
    expect(matchEvent("slack_message", { channel: "C1" }, event)).toEqual(event);
  });
});

// ─── formatLabel ────────────────────────────────────────

describe("formatLabel", () => {
  it("formats with channel", () => {
    expect(formatLabel("slack_message", { channel: "general" })).toBe("New message in #general");
  });

  it("formats without channel", () => {
    expect(formatLabel("slack_message", {})).toBe("New Slack message");
  });
});

// ─── buildConfig ────────────────────────────────────────

describe("buildConfig", () => {
  it("returns empty config when no input", () => {
    expect(buildConfig("slack_message", {})).toEqual({});
  });

  it("includes channel when provided", () => {
    expect(buildConfig("slack_message", { channel: "general" })).toEqual({ channel: "general" });
  });
});
