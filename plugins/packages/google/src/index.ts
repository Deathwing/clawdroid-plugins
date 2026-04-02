import type { PluginContext, ToolError, ToolResult } from "../../../quickjs.d";
import { MissingParameterError } from "./params";
import { errorResult } from "./result";
import { listEvents, createEvent, getEvent } from "./tools/calendar";
import { listSpaces, sendChatMessage } from "./tools/chat";
import { listLabels, readEmail, searchEmails, sendEmail } from "./tools/gmail";
import { checkCalendarTrigger } from "./triggers/calendar";
import { checkGmailTrigger } from "./triggers/gmail";

type ToolInput = Record<string, unknown>;
type NotificationPayload = {
  packageName: string;
  appName?: string;
  title?: string;
  text?: string;
  bigText?: string;
  conversationTitle?: string;
  timestamp?: number;
  messages?: Array<{ sender?: string; text?: string }>;
};

export function discoverTools(): [] {
  return [];
}

export async function execute(
  toolName: string,
  input: ToolInput,
  ctx: PluginContext,
): Promise<ToolResult | ToolError> {
  const token = await ctx.host.getSecret("token");
  if (!token) {
    return errorResult(
      "Google not connected. Sign in via Plugin settings.",
      "Google connection required",
    );
  }

  try {
    switch (toolName) {
      case "gmail_send_email":
        return await sendEmail(token, input);
      case "gmail_search":
        return await searchEmails(token, input);
      case "gmail_read_email":
        return await readEmail(token, input);
      case "gmail_list_labels":
        return await listLabels(token);
      case "gcalendar_list_events":
        return await listEvents(token, input);
      case "gcalendar_create_event":
        return await createEvent(token, input);
      case "gcalendar_get_event":
        return await getEvent(token, input);
      case "gchat_list_spaces":
        return await listSpaces(token);
      case "gchat_send_message":
        return await sendChatMessage(token, input);
      default:
        return errorResult(`Unknown Google tool: ${toolName}`, "Unsupported Google tool");
    }
  } catch (err: unknown) {
    if (err instanceof MissingParameterError) {
      return errorResult(err.message, `Missing ${err.parameter}`);
    }
    const message = err instanceof Error ? err.message : String(err);
    return errorResult(message, "Google request failed");
  }
}

export async function checkTrigger(
  triggerType: string,
  config: Record<string, unknown>,
  state: Record<string, unknown>,
  ctx: PluginContext,
): Promise<{ events: Record<string, string>[]; state: Record<string, unknown> }> {
  switch (triggerType) {
    case "gmail_received":
      return checkGmailTrigger(config, state, ctx) as any;
    case "gcalendar_event_starting":
      return checkCalendarTrigger(config, state, ctx) as any;
    default:
      return { events: [], state };
  }
}

export function matchEvent(
  triggerType: string,
  config: Record<string, unknown>,
  eventData: Record<string, string>,
): Record<string, string> | null {
  switch (triggerType) {
    case "gmail_received": {
      const fromFilter = typeof config.from_filter === "string" ? config.from_filter : undefined;
      const subjectFilter = typeof config.subject_filter === "string" ? config.subject_filter : undefined;
      if (fromFilter && !eventData.from?.toLowerCase().includes(fromFilter.toLowerCase())) {
        return null;
      }
      if (subjectFilter && !eventData.subject?.toLowerCase().includes(subjectFilter.toLowerCase())) {
        return null;
      }
      return eventData;
    }
    case "gcalendar_event_starting":
      return eventData;
    default:
      return null;
  }
}

export function formatLabel(triggerType: string, config: Record<string, unknown>): string {
  switch (triggerType) {
    case "gmail_received": {
      const from = typeof config.from_filter === "string" ? config.from_filter : undefined;
      const subject = typeof config.subject_filter === "string" ? config.subject_filter : undefined;
      let label = "Gmail";
      if (from) label += ` from ${from}`;
      if (subject) label += ` re: ${subject}`;
      if (!from && !subject) label += " (any email)";
      return label;
    }
    case "gcalendar_event_starting": {
      const minutesBefore = typeof config.minutes_before === "string" && config.minutes_before.length > 0
        ? config.minutes_before
        : "10";
      return `Calendar event (${minutesBefore}min before)`;
    }
    default:
      return "Google Workspace";
  }
}

export function buildConfig(
  triggerType: string,
  input: Record<string, unknown>,
): Record<string, unknown> {
  switch (triggerType) {
    case "gmail_received": {
      const config: Record<string, string> = {};
      if (typeof input.from_filter === "string" && input.from_filter.trim().length > 0) {
        config.from_filter = input.from_filter.trim();
      }
      if (typeof input.subject_filter === "string" && input.subject_filter.trim().length > 0) {
        config.subject_filter = input.subject_filter.trim();
      }
      return config;
    }
    case "gcalendar_event_starting": {
      const config: Record<string, string> = {};
      if (input.minutes_before !== undefined && input.minutes_before !== null && String(input.minutes_before).trim().length > 0) {
        config.minutes_before = String(input.minutes_before).trim();
      }
      if (typeof input.calendar_id === "string" && input.calendar_id.trim().length > 0) {
        config.calendar_id = input.calendar_id.trim();
      }
      return config;
    }
    default:
      return {};
  }
}

export function parseNotification(
  _appType: string,
  notification: NotificationPayload,
): Record<string, string> | null {
  const sender = notification.title?.trim();
  const subject = notification.text?.trim();
  const body = (notification.bigText || notification.text)?.trim();
  if (!sender || !body) {
    return null;
  }

  return {
    moduleType: "email",
    sender,
    subject: subject || "",
    text: body,
  };
}