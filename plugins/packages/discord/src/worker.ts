/**
 * Discord Gateway WebSocket trigger worker.
 *
 * Runs in the embedded Node.js bridge context (NOT QuickJS).
 * Receives (config, emit, onCleanup) from the trigger_worker_start handler.
 *
 * - Opens a WebSocket to the Discord Gateway
 * - Identifies with bot token and intents 513 (GUILDS + GUILD_MESSAGES)
 * - Heartbeats on the server-provided interval
 * - Emits MESSAGE_CREATE events via emit() for Kotlin to poll
 * - Reconnects with exponential backoff on failure
 */

const GATEWAY_URL = "wss://gateway.discord.gg/?v=10&encoding=json";
const MAX_RECONNECT_DELAY = 60000;

let ws: WebSocket | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let sequence: number | null = null;
let sessionId: string | null = null;
let reconnectDelay = 1000;
let stopped = false;

function connect(token: string, emit: (data: Record<string, string>) => void) {
  if (stopped) return;

  try {
    ws = new WebSocket(GATEWAY_URL);
  } catch (err) {
    console.error("[discord-worker] WebSocket create failed:", err);
    scheduleReconnect(token, emit);
    return;
  }

  ws.onopen = () => {
    console.log("[discord-worker] Gateway connected");
    reconnectDelay = 1000; // Reset backoff on successful connection
  };

  ws.onmessage = (event: MessageEvent) => {
    try {
      const payload = JSON.parse(String(event.data));
      const op = payload.op;

      switch (op) {
        case 10: { // Hello
          const heartbeatInterval = payload.d?.heartbeat_interval ?? 41250;
          startHeartbeat(heartbeatInterval);
          // Send Identify
          ws!.send(JSON.stringify({
            op: 2,
            d: {
              token,
              intents: 513, // GUILDS(1) + GUILD_MESSAGES(512)
              properties: {
                os: "android",
                browser: "clawdroid",
                device: "clawdroid",
              },
            },
          }));
          break;
        }
        case 11: // Heartbeat ACK
          break;
        case 0: { // Dispatch
          if (payload.s != null) sequence = payload.s;
          const t = payload.t;
          const d = payload.d;
          if (t === "READY") {
            sessionId = d?.session_id ?? null;
            console.log("[discord-worker] Gateway READY, session=" + sessionId);
          } else if (t === "MESSAGE_CREATE" && d) {
            const author = d.author?.username;
            if (!author) break;
            emit({
              author,
              content: d.content ?? "",
              channel_id: d.channel_id ?? "",
              channel_name: d.channel_id ?? "", // Gateway doesn't include channel name
              message_id: d.id ?? "",
            });
          }
          break;
        }
      }
    } catch (err) {
      console.error("[discord-worker] Error processing Gateway message:", err);
    }
  };

  ws.onerror = (event: Event) => {
    console.error("[discord-worker] WebSocket error:", event);
  };

  ws.onclose = (event: CloseEvent) => {
    console.log("[discord-worker] Gateway closed:", event.code, event.reason);
    cleanup();
    if (!stopped) {
      scheduleReconnect(token, emit);
    }
  };
}

function startHeartbeat(intervalMs: number) {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ op: 1, d: sequence }));
    }
  }, intervalMs);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function cleanup() {
  stopHeartbeat();
  if (ws) {
    try { ws.close(); } catch (_) {}
    ws = null;
  }
}

function scheduleReconnect(token: string, emit: (data: Record<string, string>) => void) {
  if (stopped) return;
  console.log(`[discord-worker] Reconnecting in ${reconnectDelay}ms...`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect(token, emit);
  }, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
}

// ─── Entry point ────────────────────────────────────────────

const token = (config as any).token as string;
if (!token) {
  console.error("[discord-worker] No bot token in config");
} else {
  connect(token, emit);
}

onCleanup(() => {
  stopped = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  cleanup();
  console.log("[discord-worker] Cleaned up");
});
