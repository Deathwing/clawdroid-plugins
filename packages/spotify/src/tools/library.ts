// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { spotifyGet, spotifyPut, spotifyDelete } from "../api";
import { required, optional } from "../params";
import type { SpotifyTrack, SpotifyPaging, SpotifyPlayHistory } from "../types";

export async function getSavedTracks(token: string, input: Record<string, unknown>): Promise<string> {
  const limit = optional(input, "limit", 20);
  const offset = optional(input, "offset", 0);
  const resp = await spotifyGet(token, `/me/tracks?limit=${limit}&offset=${offset}`);
  const paging: SpotifyPaging<{ added_at: string; track: SpotifyTrack }> = resp.json();
  if (!paging.items.length) return "No saved tracks.";
  const lines = paging.items.map((item, i) => {
    const t = item.track;
    const artists = t.artists.map((a) => a.name).join(", ");
    return `${Number(offset) + i + 1}. ${t.name} — ${artists} [${t.album.name}] (${t.uri})`;
  });
  return `Saved tracks (${paging.total} total):\n${lines.join("\n")}`;
}

export async function saveTracks(token: string, input: Record<string, unknown>): Promise<string> {
  const ids = required(input, "track_ids");
  const idList = ids.split(",").map((id: string) => id.trim());
  await spotifyPut(token, `/me/tracks`, { ids: idList });
  return `Saved ${idList.length} track(s) to library.`;
}

export async function removeSavedTracks(token: string, input: Record<string, unknown>): Promise<string> {
  const ids = required(input, "track_ids");
  const idList = ids.split(",").map((id: string) => id.trim());
  await spotifyDelete(token, `/me/tracks`, { ids: idList });
  return `Removed ${idList.length} track(s) from library.`;
}

export async function getTopItems(token: string, input: Record<string, unknown>): Promise<string> {
  const type = optional(input, "type", "tracks");
  const timeRange = optional(input, "time_range", "medium_term");
  const limit = optional(input, "limit", 20);
  const resp = await spotifyGet(token, `/me/top/${type}?time_range=${timeRange}&limit=${limit}`);
  const paging = resp.json();
  if (!paging.items || !paging.items.length) return `No top ${type} found.`;

  if (type === "tracks") {
    const lines = paging.items.map((t: SpotifyTrack, i: number) => {
      const artists = t.artists.map((a) => a.name).join(", ");
      return `${i + 1}. ${t.name} — ${artists} (${t.uri})`;
    });
    return `Top tracks (${timeRange}):\n${lines.join("\n")}`;
  } else {
    const lines = paging.items.map((a: any, i: number) => {
      const genres = a.genres && a.genres.length > 0 ? ` (${a.genres.slice(0, 3).join(", ")})` : "";
      return `${i + 1}. ${a.name}${genres} — ${a.followers?.total || 0} followers`;
    });
    return `Top artists (${timeRange}):\n${lines.join("\n")}`;
  }
}

export async function getRecentlyPlayed(token: string, input: Record<string, unknown>): Promise<string> {
  const limit = optional(input, "limit", 20);
  const resp = await spotifyGet(token, `/me/player/recently-played?limit=${limit}`);
  const result = resp.json();
  const items: SpotifyPlayHistory[] = result.items || [];
  if (!items.length) return "No recently played tracks.";
  const lines = items.map((item, i) => {
    const t = item.track;
    const artists = t.artists.map((a) => a.name).join(", ");
    const time = item.played_at.replace("T", " ").replace("Z", " UTC");
    return `${i + 1}. ${t.name} — ${artists} (${time})`;
  });
  return `Recently played:\n${lines.join("\n")}`;
}
