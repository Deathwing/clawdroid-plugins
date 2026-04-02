// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { ensureOk, spotifyGet, spotifyPut, spotifyPost } from "../api";
import { required, optional } from "../params";
import type { SpotifyPlaybackState, SpotifyQueue } from "../types";
import {
  artistNames,
  clipText,
  formatDuration,
  keyValueTable,
  pluralize,
  statusBlock,
  successResult,
  tableBlock,
  textBlock,
} from "../result";

export async function getPlayback(token: string) {
  const response = await spotifyGet(token, "/me/player");
  if (response.status === 204) {
    return successResult(
      "No active playback session. Open Spotify on a device first.",
      "No active playback",
      [statusBlock("No active playback session. Open Spotify on a device first.")],
    );
  }

  const state = ensureOk(response, "Loading playback state").json() as SpotifyPlaybackState;
  if (!state.item) {
    return successResult(
      "Playback active but no track loaded.",
      "Playback active",
      [statusBlock("Playback session is active but no track is loaded.")],
    );
  }

  const track = state.item;
  const artists = artistNames(track.artists);
  const progress = formatDuration(state.progress_ms ?? 0);
  const duration = formatDuration(track.duration_ms);
  const volume = state.device.volume_percent === null || state.device.volume_percent === undefined
    ? "N/A"
    : `${state.device.volume_percent}%`;
  const message = [
    `Now ${state.is_playing ? "playing" : "paused"}: ${track.name}`,
    `Artists: ${artists}`,
    `Album: ${track.album?.name ?? "Unknown"}`,
    `Progress: ${progress} / ${duration}`,
    `Device: ${state.device.name} (${state.device.type})`,
    `Volume: ${volume}`,
    `Shuffle: ${state.shuffle_state ? "On" : "Off"}`,
    `Repeat: ${state.repeat_state}`,
    `URI: ${track.uri}`,
  ].join("\n");

  return successResult(message, `${state.is_playing ? "Playing" : "Paused"} ${clipText(track.name, 64)}`, [
    statusBlock(`Playback is ${state.is_playing ? "playing" : "paused"} on ${state.device.name}.`),
    keyValueTable([
      ["Track", track.name],
      ["Artists", artists],
      ["Album", track.album?.name ?? "Unknown"],
      ["Progress", `${progress} / ${duration}`],
      ["Device", `${state.device.name} (${state.device.type})`],
      ["Volume", volume],
      ["Shuffle", state.shuffle_state ? "On" : "Off"],
      ["Repeat", state.repeat_state],
      ["URI", track.uri],
    ]),
  ]);
}

export async function play(token: string, input: Record<string, unknown>) {
  const uri = optional<string>(input, "uri", "");
  const deviceId = optional<string>(input, "device_id", "");
  const qs = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : "";
  const body: Record<string, unknown> = {};
  if (uri) {
    if (uri.includes(":track:") || uri.includes(":episode:")) {
      body.uris = [uri];
    } else {
      body.context_uri = uri;
    }
  }
  ensureOk(
    await spotifyPut(token, `/me/player/play${qs}`, Object.keys(body).length > 0 ? body : undefined),
    "Starting playback",
  );

  const message = uri ? `Started playback for ${uri}.` : "Playback started.";
  const blocks = [statusBlock(message)];
  if (uri || deviceId) {
    blocks.push(
      keyValueTable([
        ["URI", uri],
        ["Device ID", deviceId],
      ]),
    );
  }
  return successResult(message, uri ? `Started ${clipText(uri, 56)}` : "Playback started", blocks);
}

export async function pause(token: string) {
  ensureOk(await spotifyPut(token, "/me/player/pause"), "Pausing playback");
  const message = "Playback paused.";
  return successResult(message, "Playback paused", [statusBlock(message)]);
}

export async function next(token: string) {
  ensureOk(await spotifyPost(token, "/me/player/next"), "Skipping to next track");
  const message = "Skipped to next track.";
  return successResult(message, "Skipped forward", [statusBlock(message)]);
}

export async function previous(token: string) {
  ensureOk(await spotifyPost(token, "/me/player/previous"), "Skipping to previous track");
  const message = "Skipped to previous track.";
  return successResult(message, "Skipped backward", [statusBlock(message)]);
}

export async function setVolume(token: string, input: Record<string, unknown>) {
  const volume = Number(required(input, "volume_percent"));
  if (!Number.isFinite(volume) || volume < 0 || volume > 100) {
    throw new Error("volume_percent must be a number between 0 and 100.");
  }
  ensureOk(await spotifyPut(token, `/me/player/volume?volume_percent=${volume}`), "Setting volume");
  const message = `Volume set to ${volume}%.`;
  return successResult(message, `Volume ${volume}%`, [statusBlock(message)]);
}

export async function setShuffle(token: string, input: Record<string, unknown>) {
  const state = required(input, "state");
  if (state !== "true" && state !== "false") {
    throw new Error("state must be 'true' or 'false'.");
  }
  ensureOk(await spotifyPut(token, `/me/player/shuffle?state=${state}`), "Updating shuffle mode");
  const message = `Shuffle ${state === "true" ? "enabled" : "disabled"}.`;
  return successResult(message, `Shuffle ${state === "true" ? "on" : "off"}`, [statusBlock(message)]);
}

export async function setRepeat(token: string, input: Record<string, unknown>) {
  const state = required(input, "state");
  if (state !== "track" && state !== "context" && state !== "off") {
    throw new Error("state must be one of: track, context, off.");
  }
  ensureOk(await spotifyPut(token, `/me/player/repeat?state=${state}`), "Updating repeat mode");
  const message = `Repeat mode set to ${state}.`;
  return successResult(message, `Repeat ${state}`, [statusBlock(message)]);
}

export async function addToQueue(token: string, input: Record<string, unknown>) {
  const uri = required(input, "uri");
  ensureOk(await spotifyPost(token, `/me/player/queue?uri=${encodeURIComponent(uri)}`), "Adding item to queue");
  const message = `Added ${uri} to the queue.`;
  return successResult(message, `Queued ${clipText(uri, 56)}`, [
    statusBlock("Track added to queue."),
    keyValueTable([["URI", uri]]),
  ]);
}

export async function getQueue(token: string) {
  const queue = ensureOk(await spotifyGet(token, "/me/player/queue"), "Loading queue").json() as SpotifyQueue;
  const lines: string[] = [];
  const blocks = [
    statusBlock(
      queue.queue.length === 0
        ? queue.currently_playing
          ? "Nothing is queued after the current track."
          : "Nothing currently playing and queue is empty."
        : `Queue has ${queue.queue.length} upcoming ${pluralize(queue.queue.length, "track")}.`,
    ),
  ];

  if (queue.currently_playing) {
    const track = queue.currently_playing;
    const artists = artistNames(track.artists);
    lines.push(`Currently playing: ${track.name} — ${artists}`);
    blocks.push(textBlock("Currently playing"));
    blocks.push(
      keyValueTable([
        ["Track", track.name],
        ["Artists", artists],
        ["Album", track.album?.name ?? "Unknown"],
        ["Duration", formatDuration(track.duration_ms)],
        ["URI", track.uri],
      ]),
    );
  } else {
    lines.push("Nothing currently playing.");
  }

  if (queue.queue.length === 0) {
    lines.push("Queue is empty.");
  } else {
    const visibleQueue = queue.queue.slice(0, 20);
    const rows = visibleQueue.map((track, index) => [
      String(index + 1),
      clipText(track.name, 48),
      clipText(artistNames(track.artists), 36),
      clipText(track.album?.name ?? "Unknown", 32),
      formatDuration(track.duration_ms),
      track.uri,
    ]);

    lines.push(``);
    lines.push(`Up next (${queue.queue.length} ${pluralize(queue.queue.length, "track")}):`);
    visibleQueue.forEach((track, index) => {
      lines.push(`${index + 1}. ${track.name} — ${artistNames(track.artists)} (${track.uri})`);
    });
    if (queue.queue.length > visibleQueue.length) {
      lines.push(`...and ${queue.queue.length - visibleQueue.length} more`);
    }

    blocks.push(textBlock(`Up next (${queue.queue.length} ${pluralize(queue.queue.length, "track")}):`));
    blocks.push(tableBlock(["#", "Track", "Artists", "Album", "Duration", "URI"], rows));
    if (queue.queue.length > visibleQueue.length) {
      blocks.push(textBlock(`Showing first ${visibleQueue.length} queued tracks.`));
    }
  }

  return successResult(
    lines.join("\n"),
    queue.queue.length > 0 ? `${queue.queue.length} queued ${pluralize(queue.queue.length, "track")}` : "Queue empty",
    blocks,
  );
}
