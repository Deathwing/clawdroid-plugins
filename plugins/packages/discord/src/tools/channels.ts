import type { ToolResult, ToolError } from "../../../../quickjs.d";
import { discordGet, discordPost, discordPut } from "../api";
import { successResult, errorResult } from "../result";

const SNOWFLAKE_RE = /^\d{1,20}$/;

function requireSnowflake(id: string | undefined, name: string): ToolError | null {
  if (!id) return errorResult(`Missing '${name}'`, `Missing ${name}`);
  if (!SNOWFLAKE_RE.test(id))
    return errorResult(`Invalid ${name}: must be a numeric Discord ID`, `Invalid ${name}`);
  return null;
}

function clip(text: string, max: number): string {
  const s = text.replace(/\s+/g, " ").trim();
  return s.length <= max ? s : s.slice(0, max).trimEnd() + "...";
}

function plural(n: number, s: string): string {
  return n === 1 ? s : s + "s";
}

// ─── Tools ──────────────────────────────────────────────────────────

export async function sendMessage(
  token: string,
  channelId: string,
  content: string,
): Promise<ToolResult | ToolError> {
  const err = requireSnowflake(channelId, "channel_id");
  if (err) return err;
  if (!content) return errorResult("Missing 'content'", "Missing content");

  const res = await discordPost(token, `/channels/${channelId}/messages`, { content });
  if (!res.ok) return errorResult(`Discord API ${res.status}: ${res.text()}`, "Send failed");
  const obj = res.json();
  return successResult(
    `Message sent. ID: ${obj.id}`,
    "Message sent",
    [
      { type: "status", message: `Sent Discord message to channel ${channelId}.`, isSuccess: true },
      { type: "table", headers: ["Field", "Value"], rows: [["Channel ID", channelId], ["Message ID", obj.id ?? "?"]] },
      { type: "text", text: clip(content, 1000) },
    ],
  );
}

export async function listGuilds(
  token: string,
): Promise<ToolResult | ToolError> {
  const res = await discordGet(token, "/users/@me/guilds");
  if (!res.ok) return errorResult(`Discord API ${res.status}: ${res.text()}`, "List guilds failed");
  const guilds: any[] = res.json();

  if (guilds.length === 0)
    return successResult("No guilds found.", "0 servers found", [{ type: "status", message: "No Discord servers found." }]);

  const rows = guilds.map((g, i) => [
    String(i + 1),
    g.name ?? "(unnamed)",
    g.owner === true || g.owner === "true" ? "yes" : "no",
    g.id ?? "?",
  ]);
  const text = guilds.map(g => `  ${g.name ?? "(unnamed)"}${g.owner ? " (owner)" : ""} (ID: ${g.id})`).join("\n");
  return successResult(
    `Servers (${guilds.length}):\n${text}`,
    `${guilds.length} ${plural(guilds.length, "server")} found`,
    [
      { type: "status", message: `Loaded ${guilds.length} Discord ${plural(guilds.length, "server")}.`, isSuccess: true },
      { type: "table", headers: ["#", "Server", "Owner", "ID"], rows },
    ],
  );
}

export async function listChannels(
  token: string,
  guildId: string,
): Promise<ToolResult | ToolError> {
  const err = requireSnowflake(guildId, "guild_id");
  if (err) return err;

  const res = await discordGet(token, `/guilds/${guildId}/channels`);
  if (!res.ok) return errorResult(`Discord API ${res.status}: ${res.text()}`, "List channels failed");
  const channels: any[] = res.json();
  const typeNames: Record<number, string> = { 0: "text", 2: "voice", 4: "category", 5: "announcement", 13: "stage", 15: "forum" };

  if (channels.length === 0)
    return successResult("No channels found.", "0 channels found", [{ type: "status", message: `No Discord channels found in guild ${guildId}.` }]);

  const rows = channels.map((c, i) => [
    String(i + 1),
    c.name ?? "(unnamed)",
    typeNames[c.type] ?? `type=${c.type}`,
    c.id ?? "?",
  ]);
  return successResult(
    `Channels (${channels.length}):\n` + channels.map(c => `  #${c.name} (${typeNames[c.type] ?? c.type}) ID: ${c.id}`).join("\n"),
    `${channels.length} ${plural(channels.length, "channel")} found`,
    [
      { type: "status", message: `Loaded ${channels.length} Discord ${plural(channels.length, "channel")} from guild ${guildId}.`, isSuccess: true },
      { type: "table", headers: ["#", "Channel", "Type", "ID"], rows },
    ],
  );
}

export async function readMessages(
  token: string,
  channelId: string,
  limit: number,
): Promise<ToolResult | ToolError> {
  const err = requireSnowflake(channelId, "channel_id");
  if (err) return err;
  const clampedLimit = Math.max(1, Math.min(limit || 20, 100));

  const res = await discordGet(token, `/channels/${channelId}/messages?limit=${clampedLimit}`);
  if (!res.ok) return errorResult(`Discord API ${res.status}: ${res.text()}`, "Read messages failed");
  const messages: any[] = res.json();

  if (messages.length === 0)
    return successResult("No messages found.", "0 messages found", [{ type: "status", message: `No Discord messages found in channel ${channelId}.` }]);

  const ordered = [...messages].reverse();
  const rows = ordered.map((m, i) => [
    String(i + 1),
    m.author?.username ?? "?",
    m.timestamp ?? "",
    clip(m.content || "(no text content)", 120),
    m.id ?? "?",
  ]);
  return successResult(
    `Messages (${ordered.length}):\n` + ordered.map(m => `  [${m.timestamp}] ${m.author?.username}: ${m.content || "(no text)"} (ID: ${m.id})`).join("\n"),
    `${ordered.length} ${plural(ordered.length, "message")} found`,
    [
      { type: "status", message: `Loaded ${ordered.length} Discord ${plural(ordered.length, "message")} from channel ${channelId}.`, isSuccess: true },
      { type: "table", headers: ["#", "Author", "Timestamp", "Message", "ID"], rows },
    ],
  );
}

export async function getGuild(
  token: string,
  guildId: string,
): Promise<ToolResult | ToolError> {
  const err = requireSnowflake(guildId, "guild_id");
  if (err) return err;

  const res = await discordGet(token, `/guilds/${guildId}?with_counts=true`);
  if (!res.ok) return errorResult(`Discord API ${res.status}: ${res.text()}`, "Get guild failed");
  const g = res.json();

  const name = g.name ?? "?";
  const kvRows: string[][] = [
    ["Server", name],
    ["Members", String(g.approximate_member_count ?? "?")],
    ["Online", String(g.approximate_presence_count ?? "?")],
    ["Owner ID", g.owner_id ?? "?"],
    ["ID", guildId],
  ];
  const blocks: any[] = [
    { type: "status", message: `Loaded Discord server ${name}.`, isSuccess: true },
    { type: "table", headers: ["Field", "Value"], rows: kvRows },
  ];
  if (g.description) blocks.push({ type: "text", text: clip(g.description, 1000) });

  return successResult(
    `Server: ${name}\nMembers: ${g.approximate_member_count ?? "?"}\nOnline: ${g.approximate_presence_count ?? "?"}\nOwner ID: ${g.owner_id ?? "?"}\nID: ${guildId}`,
    `Server ${name}`,
    blocks,
  );
}

export async function createReaction(
  token: string,
  channelId: string,
  messageId: string,
  emoji: string,
): Promise<ToolResult | ToolError> {
  let err = requireSnowflake(channelId, "channel_id");
  if (err) return err;
  err = requireSnowflake(messageId, "message_id");
  if (err) return err;
  if (!emoji) return errorResult("Missing 'emoji'", "Missing emoji");

  const encoded = encodeURIComponent(emoji);
  const res = await discordPut(token, `/channels/${channelId}/messages/${messageId}/reactions/${encoded}/@me`);
  if (!res.ok) return errorResult(`Discord API ${res.status}: ${res.text()}`, "Reaction failed");

  return successResult(
    `Reaction ${emoji} added to message ${messageId}.`,
    "Reaction added",
    [
      { type: "status", message: `Added reaction to Discord message ${messageId}.`, isSuccess: true },
      { type: "table", headers: ["Field", "Value"], rows: [["Channel ID", channelId], ["Message ID", messageId], ["Emoji", emoji]] },
    ],
  );
}

export async function getUser(
  token: string,
): Promise<ToolResult | ToolError> {
  const res = await discordGet(token, "/users/@me");
  if (!res.ok) return errorResult(`Discord API ${res.status}: ${res.text()}`, "Get user failed");
  const u = res.json();

  const username = u.username ?? "?";
  const kvRows: string[][] = [
    ["Username", username],
  ];
  if (u.global_name) kvRows.push(["Display name", u.global_name]);
  kvRows.push(["Bot", String(u.bot ?? false)]);
  kvRows.push(["ID", u.id ?? "?"]);

  return successResult(
    `User: ${username}\nID: ${u.id ?? "?"}\nBot: ${u.bot ?? false}`,
    `User ${username}`,
    [
      { type: "status", message: `Loaded Discord bot user ${username}.`, isSuccess: true },
      { type: "table", headers: ["Field", "Value"], rows: kvRows },
    ],
  );
}

export async function createChannel(
  token: string,
  guildId: string,
  name: string,
  type: number,
  topic: string | undefined,
): Promise<ToolResult | ToolError> {
  const err = requireSnowflake(guildId, "guild_id");
  if (err) return err;
  if (!name) return errorResult("Missing 'name'", "Missing name");

  const body: Record<string, unknown> = { name, type: type || 0 };
  if (topic) body.topic = topic;

  const res = await discordPost(token, `/guilds/${guildId}/channels`, body);
  if (!res.ok) return errorResult(`Discord API ${res.status}: ${res.text()}`, "Create channel failed");
  const ch = res.json();

  const createdName = ch.name ?? name;
  const channelId = ch.id ?? "?";
  const kvRows: string[][] = [
    ["Channel", createdName],
    ["Guild ID", guildId],
    ["Type", String(type || 0)],
    ["ID", channelId],
  ];
  const blocks: any[] = [
    { type: "status", message: `Created Discord channel ${createdName} in guild ${guildId}.`, isSuccess: true },
    { type: "table", headers: ["Field", "Value"], rows: kvRows },
  ];
  if (topic) blocks.push({ type: "text", text: clip(topic, 1000) });

  return successResult(
    `Channel created: #${createdName} (ID: ${channelId})`,
    "Channel created",
    blocks,
  );
}
