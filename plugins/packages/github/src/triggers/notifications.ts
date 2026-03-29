// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { githubGet } from "../api";

interface NotificationEvent {
  title: string;
  reason: string;
  repo: string;
  type: string;
  url: string;
  timestamp: string;
}

interface IssueOrPrEvent {
  number: string;
  title: string;
  repo: string;
  url: string;
  timestamp: string;
}

interface TriggerState {
  lastPollTimestamp?: string;
}

interface TriggerResult {
  events: Record<string, string>[];
  state: TriggerState;
}

declare const host: {
  getSecret(key: string): Promise<string | null>;
};

/**
 * Polls GitHub /notifications to produce events for all three trigger types.
 * The JsToolTriggerPlugin calls checkTrigger() once per trigger type per tick,
 * so we filter the results to the requested triggerType.
 *
 * For issue_opened / pr_opened, we fetch the actual issue/PR from subject.url
 * and only emit if it was created within the last polling window (not just any
 * notification about an existing issue/PR).
 */
export async function checkNotifications(
  triggerType: string,
  _config: Record<string, unknown>,
  state: TriggerState,
): Promise<TriggerResult> {
  const token = await host.getSecret("token");
  if (!token) return { events: [], state };

  const since = state.lastPollTimestamp || new Date().toISOString();
  const encoded = encodeURIComponent(since);

  const resp = await githubGet(token, `/notifications?since=${encoded}&all=false`);
  if (!resp.ok) return { events: [], state };

  const notifications: any[] = resp.json();
  const events: Record<string, string>[] = [];

  for (const n of notifications) {
    const subject = n.subject;
    if (!subject) continue;

    const title = subject.title || "";
    const subjectType = subject.type || "";
    const subjectUrl: string = subject.url || "";
    const reason = n.reason || "";
    const repo = n.repository?.full_name || "";
    const updatedAt = n.updated_at || "";
    const htmlUrl = n.repository?.html_url || "";
    const number = subjectUrl.split("/").pop() || "";

    if (triggerType === "github_notification") {
      events.push({
        title,
        reason,
        repo,
        type: subjectType,
        url: htmlUrl,
        timestamp: updatedAt,
      });
    }

    if (triggerType === "github_issue_opened" && subjectType === "Issue" && subjectUrl) {
      if (await isRecentlyCreated(token, subjectUrl, since)) {
        events.push({ number, title, repo, url: htmlUrl, timestamp: updatedAt });
      }
    }

    if (triggerType === "github_pr_opened" && subjectType === "PullRequest" && subjectUrl) {
      if (await isRecentlyCreated(token, subjectUrl, since)) {
        events.push({ number, title, repo, url: htmlUrl, timestamp: updatedAt });
      }
    }
  }

  // Advance the poll cursor to the newest notification timestamp,
  // not the current wall-clock time, to avoid skipping events in the gap.
  let maxUpdatedAt = since;
  for (const n of notifications) {
    if (n.updated_at && n.updated_at > maxUpdatedAt) {
      maxUpdatedAt = n.updated_at;
    }
  }

  return {
    events,
    state: { ...state, lastPollTimestamp: maxUpdatedAt },
  };
}

/**
 * Fetch the actual issue/PR from the GitHub API and check if its created_at
 * is after the last poll timestamp. This prevents false positives from comment,
 * label, or merge notifications on old issues/PRs.
 */
async function isRecentlyCreated(
  token: string,
  apiUrl: string,
  sinceTimestamp: string,
): Promise<boolean> {
  try {
    const resp = await githubGet(token, apiUrl.replace("https://api.github.com", ""));
    if (!resp.ok) return false;
    const obj = resp.json();
    const createdAt = obj.created_at;
    if (!createdAt) return false;
    return new Date(createdAt).getTime() >= new Date(sinceTimestamp).getTime();
  } catch {
    // If we can't verify, don't emit a false positive
    return false;
  }
}
