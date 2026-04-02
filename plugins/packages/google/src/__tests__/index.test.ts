import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();
const mockHost = {
  getSecret: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  listDirectory: vi.fn(),
  httpFetch: vi.fn(),
  log: vi.fn(),
};

vi.stubGlobal("fetch", mockFetch);
vi.stubGlobal("host", mockHost);
vi.stubGlobal("console", { log: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() });

import { buildConfig, checkTrigger, discoverTools, execute, formatLabel, matchEvent } from "../index";

function mockCtx(token: string | null = "google-test-token") {
  return { host: { ...mockHost, getSecret: vi.fn().mockResolvedValue(token) } as any };
}

function jsonResp(data: unknown, status = 200) {
  return {
    ok: status < 400,
    status,
    text: () => JSON.stringify(data),
    json: () => data,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("discoverTools", () => {
  it("returns empty array", () => {
    expect(discoverTools()).toEqual([]);
  });
});

describe("execute", () => {
  it("returns structured error when no token", async () => {
    const result = await execute("gmail_search", {}, mockCtx(null));
    expect(result).toMatchObject({
      error: true,
      message: "Google not connected. Sign in via Plugin settings.",
      summary: "Google connection required",
    });
  });

  it("returns structured error for unknown tool", async () => {
    const result = await execute("google_unknown", {}, mockCtx());
    expect(result).toMatchObject({
      error: true,
      message: "Unknown Google tool: google_unknown",
      summary: "Unsupported Google tool",
    });
  });

  it("dispatches gmail_search", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({ messages: [{ id: "msg_1", threadId: "thread_1" }] }),
    );

    const result = await execute("gmail_search", { query: "is:unread" }, mockCtx());
    expect((result as any).message).toContain("msg_1");
    expect((result as any).summary).toBe("1 message found");
    expect((result as any).blocks[1]).toMatchObject({ type: "table" });
  });

  it("dispatches gmail_read_email", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({
        snippet: "This is the preview",
        payload: {
          headers: [
            { name: "From", value: "alice@example.com" },
            { name: "Subject", value: "Status update" },
            { name: "Date", value: "Tue, 1 Jan 2026 10:00:00 +0000" },
          ],
        },
      }),
    );

    const result = await execute("gmail_read_email", { message_id: "msg_1" }, mockCtx());
    expect((result as any).message).toContain("alice@example.com");
    expect((result as any).summary).toBe("Email Status update");
  });

  it("dispatches gmail_send_email", async () => {
    mockFetch.mockResolvedValue(jsonResp({ id: "sent_123" }));

    const result = await execute(
      "gmail_send_email",
      { to: "bob@example.com", subject: "Hello", body: "Testing" },
      mockCtx(),
    );

    expect((result as any).summary).toBe("Email sent");
    expect((result as any).blocks[0]).toMatchObject({ type: "status", isSuccess: true });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("dispatches gcalendar_list_events", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({
        items: [
          {
            id: "evt_1",
            summary: "Standup",
            start: { dateTime: "2026-01-01T10:00:00Z" },
          },
        ],
      }),
    );

    const result = await execute("gcalendar_list_events", {}, mockCtx());
    expect((result as any).message).toContain("Standup");
    expect((result as any).summary).toBe("1 event found");
  });

  it("dispatches gchat_list_spaces", async () => {
    mockFetch.mockResolvedValue(
      jsonResp({
        spaces: [
          { name: "spaces/AAAA", displayName: "Engineering", type: "SPACE" },
        ],
      }),
    );

    const result = await execute("gchat_list_spaces", {}, mockCtx());
    expect((result as any).message).toContain("Engineering");
    expect((result as any).summary).toBe("1 space found");
  });

  it("returns specific summary for missing parameters", async () => {
    const result = await execute("gchat_send_message", { text: "Hello" }, mockCtx());
    expect(result).toMatchObject({
      error: true,
      message: "Missing 'space_id' parameter",
      summary: "Missing space_id",
    });
  });
});

describe("checkTrigger", () => {
  it("uses the passed plugin context for gmail polling", async () => {
    const ctx = mockCtx();
    mockHost.getSecret.mockResolvedValue(null);
    mockFetch
      .mockResolvedValueOnce(jsonResp({ messages: [{ id: "msg_1" }] }))
      .mockResolvedValueOnce(jsonResp({
        internalDate: "1767261600000",
        snippet: "Please review the draft",
        payload: {
          headers: [
            { name: "From", value: "boss@example.com" },
            { name: "Subject", value: "Review" },
          ],
        },
      }));

    const result = await checkTrigger(
      "gmail_received",
      {},
      { lastMailTimestamp: 1767261000, seenMessageIds: [] },
      ctx as any,
    );

    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      from: "boss@example.com",
      subject: "Review",
      snippet: "Please review the draft",
      message_id: "msg_1",
    });
    expect((ctx as any).host.getSecret).toHaveBeenCalledWith("token");
    expect(mockHost.getSecret).not.toHaveBeenCalled();
  });

  it("uses the passed plugin context for calendar polling", async () => {
    const ctx = mockCtx();
    mockHost.getSecret.mockResolvedValue(null);
    mockFetch.mockResolvedValue(
      jsonResp({
        items: [
          {
            id: "evt_1",
            summary: "Demo",
            start: { dateTime: "2026-01-01T11:00:00Z" },
            end: { dateTime: "2026-01-01T11:30:00Z" },
            location: "Meet",
          },
        ],
      }),
    );

    const result = await checkTrigger(
      "gcalendar_event_starting",
      { minutes_before: "15", calendar_id: "team" },
      { emittedEventIds: [] },
      ctx as any,
    );

    expect(result.events).toEqual([
      {
        event_title: "Demo",
        start_time: "2026-01-01T11:00:00Z",
        end_time: "2026-01-01T11:30:00Z",
        location: "Meet",
        event_id: "evt_1",
      },
    ]);
    expect(result.state).toMatchObject({ emittedEventIds: ["evt_1"] });
    expect((ctx as any).host.getSecret).toHaveBeenCalledWith("token");
    expect(mockHost.getSecret).not.toHaveBeenCalled();
  });
});

describe("matchEvent", () => {
  it("filters gmail by sender", () => {
    const event = { from: "Boss@example.com", subject: "Review" };
    expect(matchEvent("gmail_received", { from_filter: "boss" }, event)).toEqual(event);
    expect(matchEvent("gmail_received", { from_filter: "alice" }, event)).toBeNull();
  });

  it("filters gmail by subject", () => {
    const event = { from: "boss@example.com", subject: "Quarterly Review" };
    expect(matchEvent("gmail_received", { subject_filter: "review" }, event)).toEqual(event);
    expect(matchEvent("gmail_received", { subject_filter: "invoice" }, event)).toBeNull();
  });

  it("always returns calendar events", () => {
    const event = { event_title: "Standup" };
    expect(matchEvent("gcalendar_event_starting", {}, event)).toEqual(event);
  });
});

describe("formatLabel", () => {
  it("formats gmail labels", () => {
    expect(formatLabel("gmail_received", { from_filter: "boss@example.com" })).toBe("Gmail from boss@example.com");
    expect(formatLabel("gmail_received", { subject_filter: "urgent" })).toBe("Gmail re: urgent");
    expect(formatLabel("gmail_received", {})).toBe("Gmail (any email)");
  });

  it("formats calendar labels", () => {
    expect(formatLabel("gcalendar_event_starting", { minutes_before: "15" })).toBe("Calendar event (15min before)");
    expect(formatLabel("gcalendar_event_starting", {})).toBe("Calendar event (10min before)");
  });
});

describe("buildConfig", () => {
  it("builds gmail config", () => {
    expect(buildConfig("gmail_received", { from_filter: "boss", subject_filter: "urgent" })).toEqual({
      from_filter: "boss",
      subject_filter: "urgent",
    });
  });

  it("builds calendar config", () => {
    expect(buildConfig("gcalendar_event_starting", { minutes_before: 15, calendar_id: "team" })).toEqual({
      minutes_before: "15",
      calendar_id: "team",
    });
  });

  it("returns empty config for unknown triggers", () => {
    expect(buildConfig("unknown", {})).toEqual({});
  });
});