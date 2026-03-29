// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { spotifyGet, spotifyPut, spotifyPost } from "../api";
import { required, optional } from "../params";
import type { SpotifyPlaybackState, SpotifyQueue } from "../types";

function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export async function getPlayback(token: string): Promise<string> {
  const resp = await spotifyGet(token, "/me/player");
  if (resp.status === 204) return "No active playback session. Open Spotify on a device first.";
  const state: SpotifyPlaybackState = resp.json();
  if (!state.item) return "Playback active but no track loaded.";
  const t = state.item;
  const artists = t.artists.map((a) => a.name).join(", ");
  const progress = state.progress_ms ? formatDuration(state.progress_ms) : "0:00";
  const duration = formatDuration(t.duration_ms);
  return [
    `Now ${state.is_playing ? "playing" : "paused"}: ${t.name}`,
    `Artist: ${artists}`,
    `Album: ${t.album.name}`,
    `Progress: ${progress} / ${duration}`,
    `Device: ${state.device.name} (${state.device.type})`,
    `Volume: ${state.device.volume_percent ?? "N/A"}%`,
    `Shuffle: ${state.shuffle_state ? "on" : "off"}`,
    `Repeat: ${state.repeat_state}`,
    `URI: ${t.uri}`,
  ].join("\n");
}

export async function play(token: string, input: Record<string, unknown>): Promise<string> {
  const uri = optional<string>(input, "uri", "");
  const deviceId = optional<string>(input, "device_id", "");
  const qs = deviceId ? `?device_id=${deviceId}` : "";
  const body: Record<string, unknown> = {};
  if (uri) {
    if (uri.includes(":track:") || uri.includes(":episode:")) {
      body.uris = [uri];
    } else {
      body.context_uri = uri;
    }
  }
  await spotifyPut(token, `/me/player/play${qs}`, Object.keys(body).length > 0 ? body : undefined);
  return "Playback started.";
}

export async function pause(token: string): Promise<string> {
  await spotifyPut(token, "/me/player/pause");
  return "Playback paused.";
}

export async function next(token: string): Promise<string> {
  await spotifyPost(token, "/me/player/next");
  return "Skipped to next track.";
}

export async function previous(token: string): Promise<string> {
  await spotifyPost(token, "/me/player/previous");
  return "Skipped to previous track.";
}

export async function setVolume(token: string, input: Record<string, unknown>): Promise<string> {
  const volume = required(input, "volume_percent");
  await spotifyPut(token, `/me/player/volume?volume_percent=${volume}`);
  return `Volume set to ${volume}%.`;
}

export async function setShuffle(token: string, input: Record<string, unknown>): Promise<string> {
  const state = required(input, "state");
  await spotifyPut(token, `/me/player/shuffle?state=${state}`);
  return `Shuffle ${state === "true" ? "enabled" : "disabled"}.`;
}

export async function setRepeat(token: string, input: Record<string, unknown>): Promise<string> {
  const state = required(input, "state");
  await spotifyPut(token, `/me/player/repeat?state=${state}`);
  return `Repeat mode set to ${state}.`;
}

export async function addToQueue(token: string, input: Record<string, unknown>): Promise<string> {
  const uri = required(input, "uri");
  await spotifyPost(token, `/me/player/queue?uri=${encodeURIComponent(uri)}`);
  return "Track added to queue.";
}

export async function getQueue(token: string): Promise<string> {
  const resp = await spotifyGet(token, "/me/player/queue");
  const q: SpotifyQueue = resp.json();
  const lines: string[] = [];
  if (q.currently_playing) {
    const t = q.currently_playing;
    const artists = t.artists.map((a) => a.name).join(", ");
    lines.push(`Currently playing: ${t.name} — ${artists}`);
  } else {
    lines.push("Nothing currently playing.");
  }
  if (q.queue.length === 0) {
    lines.push("Queue is empty.");
  } else {
    lines.push(`\nUp next (${q.queue.length} tracks):`);
    q.queue.slice(0, 20).forEach((t, i) => {
      const artists = t.artists.map((a) => a.name).join(", ");
      lines.push(`${i + 1}. ${t.name} — ${artists}`);
    });
    if (q.queue.length > 20) {
      lines.push(`...and ${q.queue.length - 20} more`);
    }
  }
  return lines.join("\n");
}
