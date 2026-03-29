// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

/**
 * ClawDroid Node.js automation script type declarations.
 *
 * Include this file in your automation script project's tsconfig.json:
 *
 *   "include": ["path/to/automation.d.ts", "your-script.ts"]
 *
 * Automation scripts are `.js` files referenced by `AutomationEntity.scriptPath`
 * (a workspace-relative path). They run inside the embedded Node.js bridge
 * (bridge.js / NodeEngine). Before your script is eval'd, bridge.js injects
 * `global.clawdroid` with the API below.
 *
 * IMPORTANT: Actions do NOT execute synchronously. They are accumulated into an
 * internal list and dispatched by AutomationManager after your script completes.
 *
 * You have access to the full Node.js standard library and any npm packages
 * installed in the workspace via `npm install`.
 *
 * Trigger variables (e.g. SMS sender, notification text) are available on
 * `global.__vars` and typed according to which trigger fired the automation.
 */

/** Available in Node.js automation scripts as `global.clawdroid`. */
export interface ClawDroidAutomationApi {
  /**
   * Post a local Android notification.
   *
   * @example
   * clawdroid.notify("Task done", "The scheduled job completed successfully.");
   */
  notify(title: string, message: string): void;

  /**
   * Trigger another automation by its ID, optionally passing extra variables.
   * The target automation receives the variables on `global.__vars`.
   *
   * @example
   * clawdroid.triggerAutomation("send-daily-report", { date: new Date().toISOString() });
   */
  triggerAutomation(automationId: string, variables?: Record<string, any>): void;

  /**
   * Spawn a new LLM agent session in the specified container with the given prompt.
   * The agent runs to completion asynchronously after the script finishes.
   *
   * @example
   * clawdroid.spawnAgent("my-assistant", `Summarize this: ${content}`);
   */
  spawnAgent(containerId: string, prompt: string): void;

  /**
   * Send an SMS message.
   *
   * @example
   * clawdroid.sendSms("+1234567890", "Hello from ClawDroid!");
   */
  sendSms(to: string, message: string): void;
}

declare global {
  /**
   * ClawDroid automation API — injected by bridge.js before script eval.
   * Only available in Node.js automation scripts, NOT in QuickJS plugins.
   */
  // eslint-disable-next-line no-var
  var clawdroid: ClawDroidAutomationApi;

  /**
   * Trigger variables injected by AutomationManager before the script runs.
   * Shape depends on the trigger type that fired the automation.
   *
   * Common fields (all triggers):
   *   - `__vars.triggerId`   — automation ID
   *   - `__vars.triggerType` — e.g. "schedule", "sms_received", "notification"
   *
   * SMS trigger additional fields:
   *   - `__vars.sender`  — phone number of the sender
   *   - `__vars.message` — body of the received SMS
   *
   * Notification trigger additional fields:
   *   - `__vars.appPackage` — package name of the notifying app
   *   - `__vars.title`      — notification title
   *   - `__vars.text`       — notification body text
   */
  // eslint-disable-next-line no-var
  var __vars: Record<string, any>;
}
