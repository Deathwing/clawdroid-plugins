// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

/**
 * ClawDroid Outlook Plugin — entry point
 *
 * Exports:
 * - discoverTools() + execute() — tool execution
 * - checkTrigger() — polling triggers
 * - matchEvent() — per-automation event filtering
 * - formatLabel() — human-readable trigger label
 * - buildConfig() — build trigger config from input
 */

import type { PluginContext, ToolResult, ToolError } from "../../../clawdroid.d";
import { sendMail, listMail, readMail, searchMail } from "./tools/mail";
import { listEvents, createEvent } from "./tools/calendar";
import { listTeams, listChannels, sendTeamsMessage } from "./tools/teams";
import { checkMailTrigger } from "./triggers/mail";
import { checkCalendarTrigger } from "./triggers/calendar";

type ToolInput = Record<string, unknown>;

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
    return { error: true, message: "Microsoft not connected. Sign in via Plugin settings." };
  }

  let result: string;
  switch (toolName) {
    case "outlook_send_mail":
      result = await sendMail(token, input);
      break;
    case "outlook_list_mail":
      result = await listMail(token, input);
      break;
    case "outlook_read_mail":
      result = await readMail(token, input);
      break;
    case "outlook_search_mail":
      result = await searchMail(token, input);
      break;
    case "outlook_list_events":
      result = await listEvents(token, input);
      break;
    case "outlook_create_event":
      result = await createEvent(token, input);
      break;
    case "teams_list_teams":
      result = await listTeams(token);
      break;
    case "teams_list_channels":
      result = await listChannels(token, input);
      break;
    case "teams_send_message":
      result = await sendTeamsMessage(token, input);
      break;
    default:
      return { error: true, message: `Unknown Outlook tool: ${toolName}` };
  }

  return { message: result };
}

// ─── Trigger Exports ────────────────────────────────────────

export async function checkTrigger(
  triggerType: string,
  config: Record<string, unknown>,
  state: Record<string, unknown>,
  _ctx: PluginContext,
): Promise<{ events: Record<string, string>[]; state: Record<string, unknown> }> {
  switch (triggerType) {
    case "outlook_mail_received":
      return checkMailTrigger(config, state) as any;
    case "outlook_event_starting":
      return checkCalendarTrigger(config, state) as any;
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
    case "outlook_mail_received": {
      const fromFilter = config.from_filter as string | undefined;
      const subjectFilter = config.subject_filter as string | undefined;
      if (fromFilter && !eventData.from?.toLowerCase().includes(fromFilter.toLowerCase())) {
        return null;
      }
      if (subjectFilter && !eventData.subject?.toLowerCase().includes(subjectFilter.toLowerCase())) {
        return null;
      }
      return eventData;
    }
    case "outlook_event_starting":
      // Always matches — polling already filters by time window
      return eventData;
    default:
      return null;
  }
}

export function formatLabel(
  triggerType: string,
  config: Record<string, unknown>,
): string {
  switch (triggerType) {
    case "outlook_mail_received": {
      const from = config.from_filter as string | undefined;
      const subj = config.subject_filter as string | undefined;
      let label = "Outlook Mail";
      if (from) label += ` from ${from}`;
      if (subj) label += ` re: ${subj}`;
      if (!from && !subj) label += " (any email)";
      return label;
    }
    case "outlook_event_starting": {
      const mins = (config.minutes_before as string) || "10";
      return `Outlook event (${mins}min before)`;
    }
    default:
      return "Microsoft 365";
  }
}

export function buildConfig(
  triggerType: string,
  input: Record<string, unknown>,
): Record<string, unknown> {
  switch (triggerType) {
    case "outlook_mail_received": {
      const cfg: Record<string, string> = {};
      if (input.from_filter) cfg.from_filter = String(input.from_filter);
      if (input.subject_filter) cfg.subject_filter = String(input.subject_filter);
      return cfg;
    }
    case "outlook_event_starting": {
      const cfg: Record<string, string> = {};
      if (input.minutes_before) cfg.minutes_before = String(input.minutes_before);
      return cfg;
    }
    default:
      return {};
  }
}
