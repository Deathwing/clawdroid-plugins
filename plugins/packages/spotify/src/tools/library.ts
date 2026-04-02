// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { ensureOk, spotifyDelete, spotifyGet, spotifyPut } from "../api";
import { required, optional } from "../params";
import type { SpotifyTrack, SpotifyPaging, SpotifyPlayHistory } from "../types";
import {
  artistNames,
  clipText,
  formatNumber,
  pluralize,
  spotifyUri,
  statusBlock,
  successResult,
  tableBlock,
  textBlock,
} from "../result";

function splitIds(rawValue: string): string[] {
  return rawValue.split(",").map((value) => value.trim()).filter((value) => value.length > 0);
}

function idPreviewBlocks(label: string, ids: string[]) {
  if (ids.length === 0) {
    return [];
  }
  const visibleIds = ids.slice(0, 10);
  const blocks = [
    textBlock(label),
    tableBlock(["#", "ID"], visibleIds.map((id, index) => [String(index + 1), id])),
  ];
  if (ids.length > visibleIds.length) {
    blocks.push(textBlock(`Showing first ${visibleIds.length} of ${ids.length} IDs.`));
  }
  return blocks;
}

export async function getSavedTracks(token: string, input: Record<string, unknown>) {
  const limit = optional(input, "limit", 20);
  const offset = optional(input, "offset", 0);
  const paging = ensureOk(await spotifyGet(token, `/me/tracks?limit=${limit}&offset=${offset}`), "Loading saved tracks")
    .json() as SpotifyPaging<{ added_at: string; track: SpotifyTrack }>;
  if (!paging.items.length) {
    return successResult("No saved tracks.", "No saved tracks", [statusBlock("No saved tracks found in your library.")]);
  }

  const numericOffset = Number(offset);
  const rows = paging.items.map((item, index) => [
    String(numericOffset + index + 1),
    clipText(item.track.name, 48),
    clipText(artistNames(item.track.artists), 36),
    clipText(item.track.album?.name ?? "Unknown", 32),
    item.track.uri,
  ]);
  const lines = rows.map((row) => `${row[0]}. ${row[1]} — ${row[2]} [${row[3]}] (${row[4]})`);
  return successResult(
    `Saved tracks (${formatNumber(paging.total, String(paging.items.length))} total):\n${lines.join("\n")}`,
    `${paging.items.length} saved ${pluralize(paging.items.length, "track")}`,
    [
      statusBlock(`Loaded ${paging.items.length} saved ${pluralize(paging.items.length, "track")}.`),
      tableBlock(["#", "Track", "Artists", "Album", "URI"], rows),
    ],
  );
}

export async function saveTracks(token: string, input: Record<string, unknown>) {
  const idList = splitIds(required(input, "track_ids"));
  if (idList.length === 0) {
    throw new Error("track_ids must contain at least one track ID.");
  }

  ensureOk(await spotifyPut(token, `/me/tracks`, { ids: idList }), "Saving tracks to library");
  const message = `Saved ${idList.length} ${pluralize(idList.length, "track")} to your library.`;
  return successResult(message, `Saved ${idList.length} ${pluralize(idList.length, "track")}`, [
    statusBlock(message),
    ...idPreviewBlocks("Track IDs", idList),
  ]);
}

export async function removeSavedTracks(token: string, input: Record<string, unknown>) {
  const idList = splitIds(required(input, "track_ids"));
  if (idList.length === 0) {
    throw new Error("track_ids must contain at least one track ID.");
  }

  ensureOk(await spotifyDelete(token, `/me/tracks`, { ids: idList }), "Removing tracks from library");
  const message = `Removed ${idList.length} ${pluralize(idList.length, "track")} from your library.`;
  return successResult(message, `Removed ${idList.length} ${pluralize(idList.length, "track")}`, [
    statusBlock(message),
    ...idPreviewBlocks("Track IDs", idList),
  ]);
}

export async function getTopItems(token: string, input: Record<string, unknown>) {
  const type = optional(input, "type", "tracks");
  const timeRange = optional(input, "time_range", "medium_term");
  const limit = optional(input, "limit", 20);
  if (type !== "tracks" && type !== "artists") {
    throw new Error("type must be 'tracks' or 'artists'.");
  }
  if (!["short_term", "medium_term", "long_term"].includes(timeRange)) {
    throw new Error("time_range must be one of: short_term, medium_term, long_term.");
  }

  const paging = ensureOk(
    await spotifyGet(token, `/me/top/${type}?time_range=${timeRange}&limit=${limit}`),
    `Loading top ${type}`,
  ).json() as SpotifyPaging<any>;
  if (!paging.items || paging.items.length === 0) {
    return successResult(
      `No top ${type} found.`,
      `No top ${type}`,
      [statusBlock(`No top ${type} found for ${timeRange.replace(/_/g, " ")}.`)],
    );
  }

  if (type === "tracks") {
    const rows = paging.items.map((track: SpotifyTrack, index: number) => [
      String(index + 1),
      clipText(track.name, 48),
      clipText(artistNames(track.artists), 36),
      clipText(track.album?.name ?? "Unknown", 32),
      track.uri,
    ]);
    const lines = rows.map((row) => `${row[0]}. ${row[1]} — ${row[2]} [${row[3]}] (${row[4]})`);
    return successResult(
      `Top tracks (${timeRange.replace(/_/g, " ")}):\n${lines.join("\n")}`,
      `Top tracks (${timeRange.replace(/_/g, " ")})`,
      [
        statusBlock(`Loaded ${paging.items.length} top tracks for ${timeRange.replace(/_/g, " ")}.`),
        tableBlock(["#", "Track", "Artists", "Album", "URI"], rows),
      ],
    );
  }

  const rows = paging.items.map((artist: any, index: number) => [
    String(index + 1),
    clipText(artist.name, 42),
    clipText((artist.genres ?? []).slice(0, 3).join(", ") || "-", 32),
    formatNumber(artist.followers?.total ?? 0),
    artist.uri ?? spotifyUri("artist", artist.id),
  ]);
  const lines = rows.map((row) => `${row[0]}. ${row[1]} (${row[2]}) — ${row[3]} followers [${row[4]}]`);
  return successResult(
    `Top artists (${timeRange.replace(/_/g, " ")}):\n${lines.join("\n")}`,
    `Top artists (${timeRange.replace(/_/g, " ")})`,
    [
      statusBlock(`Loaded ${paging.items.length} top artists for ${timeRange.replace(/_/g, " ")}.`),
      tableBlock(["#", "Artist", "Genres", "Followers", "URI"], rows),
    ],
  );
}

export async function getRecentlyPlayed(token: string, input: Record<string, unknown>) {
  const limit = optional(input, "limit", 20);
  const result = ensureOk(await spotifyGet(token, `/me/player/recently-played?limit=${limit}`), "Loading recently played tracks")
    .json() as { items?: SpotifyPlayHistory[] };
  const items: SpotifyPlayHistory[] = result.items || [];
  if (!items.length) {
    return successResult(
      "No recently played tracks.",
      "No recent plays",
      [statusBlock("No recently played tracks were returned.")],
    );
  }

  const rows = items.map((item, index) => [
    String(index + 1),
    clipText(item.track.name, 48),
    clipText(artistNames(item.track.artists), 36),
    item.played_at.replace("T", " ").replace("Z", " UTC"),
    item.track.uri,
  ]);
  const lines = rows.map((row) => `${row[0]}. ${row[1]} — ${row[2]} (${row[3]})`);
  return successResult(
    `Recently played:\n${lines.join("\n")}`,
    `${items.length} recent ${pluralize(items.length, "play")}`,
    [
      statusBlock(`Loaded ${items.length} recently played ${pluralize(items.length, "track")}.`),
      tableBlock(["#", "Track", "Artists", "Played At", "URI"], rows),
    ],
  );
}
