import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
const mockHost = { getSecret: vi.fn(), readFile: vi.fn(), writeFile: vi.fn(), listDirectory: vi.fn(), httpFetch: vi.fn(), log: vi.fn() };
vi.stubGlobal("fetch", mockFetch);
vi.stubGlobal("host", mockHost);
vi.stubGlobal("console", { log: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() });

import { discoverTools, execute, matchEvent, formatLabel, buildConfig } from "../index";

function mockCtx(token: string | null = "bot123456:ABCdef") {
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
  it("returns error when no token", async () => {
    const result = await execute("telegram_get_me", {}, mockCtx(null));
    expect(result).toEqual({ error: true, message: "Telegram not connected. Add your bot token in Settings first." });
  });

  it("returns error for unknown tool", async () => {
    const result = await execute("telegram_nonexistent", {}, mockCtx());
    expect(result).toEqual({ error: true, message: "Unknown Telegram tool: telegram_nonexistent" });
  });

  it("dispatches telegram_get_me", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({ ok: true, result: { id: 123, is_bot: true, first_name: "TestBot", username: "testbot" } }),
    );
    const result = await execute("telegram_get_me", {}, mockCtx());
    expect((result as any).message).toContain("testbot");
  });

  it("dispatches telegram_send_message", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({ ok: true, result: { message_id: 1, text: "Hello" } }),
    );
    const result = await execute("telegram_send_message", { chat_id: "123", text: "Hello" }, mockCtx());
    expect((result as any).message).toBeDefined();
  });

  it("dispatches telegram_get_chat", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({ ok: true, result: { id: 123, type: "private", title: "Test Chat" } }),
    );
    const result = await execute("telegram_get_chat", { chat_id: "123" }, mockCtx());
    expect((result as any).message).toContain("123");
  });

  it("dispatches telegram_get_updates", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({ ok: true, result: [{ update_id: 1, message: { text: "Hi", chat: { id: 1 }, from: { first_name: "Bob" }, message_id: 10, date: 1700000000 } }] }),
    );
    const result = await execute("telegram_get_updates", { limit: 5 }, mockCtx());
    expect((result as any).message).toBeDefined();
  });

  it("dispatches telegram_forward_message", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({ ok: true, result: { message_id: 2 } }),
    );
    const result = await execute(
      "telegram_forward_message",
      { chat_id: "100", from_chat_id: "200", message_id: "1" },
      mockCtx(),
    );
    expect((result as any).message).toBeDefined();
  });

  it("dispatches telegram_send_photo", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({ ok: true, result: { message_id: 3 } }),
    );
    const result = await execute(
      "telegram_send_photo",
      { chat_id: "100", photo_url: "https://example.com/img.png", caption: "Look!" },
      mockCtx(),
    );
    expect((result as any).message).toBeDefined();
  });
});

// ─── matchEvent ─────────────────────────────────────────

describe("matchEvent", () => {
  const event = { chat_id: "123", from_name: "Bob", text: "Hi", message_id: "10", date: "2023-11-01" };

  it("returns event when no filter", () => {
    expect(matchEvent("telegram_message", {}, event)).toEqual(event);
  });

  it("returns event when chat_id matches", () => {
    expect(matchEvent("telegram_message", { chat_id: "123" }, event)).toEqual(event);
  });

  it("returns null when chat_id does not match", () => {
    expect(matchEvent("telegram_message", { chat_id: "999" }, event)).toBeNull();
  });
});

// ─── formatLabel ────────────────────────────────────────

describe("formatLabel", () => {
  it("formats with chat_id", () => {
    expect(formatLabel("telegram_message", { chat_id: "123" })).toBe("New message in 123");
  });

  it("formats without chat_id", () => {
    expect(formatLabel("telegram_message", {})).toBe("New Telegram message");
  });
});

// ─── buildConfig ────────────────────────────────────────

describe("buildConfig", () => {
  it("returns empty config when no input", () => {
    expect(buildConfig("telegram_message", {})).toEqual({});
  });

  it("includes chat_id when provided", () => {
    expect(buildConfig("telegram_message", { chat_id: "123" })).toEqual({ chat_id: "123" });
  });
});
