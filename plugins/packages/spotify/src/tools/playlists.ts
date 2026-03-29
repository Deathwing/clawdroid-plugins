// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { spotifyGet, spotifyPost, spotifyPut, spotifyDelete, spotifyPutRaw } from "../api";
import { required, optional } from "../params";
import type { SpotifyPlaylist, SpotifyPaging, SpotifyTrack } from "../types";

export async function listPlaylists(token: string, input: Record<string, unknown>): Promise<string> {
  const limit = optional(input, "limit", 20);
  const resp = await spotifyGet(token, `/me/playlists?limit=${limit}`);
  const paging: SpotifyPaging<SpotifyPlaylist> = resp.json();
  if (!paging.items.length) return "No playlists found.";
  const lines = paging.items.map((p, i) => {
    const vis = p.public ? "public" : "private";
    return `${i + 1}. ${p.name} [${vis}] (${p.tracks.total} tracks) — ${p.id}`;
  });
  return `${paging.total} playlists:\n${lines.join("\n")}`;
}

export async function getPlaylist(token: string, input: Record<string, unknown>): Promise<string> {
  const playlistId = required(input, "playlist_id");
  const resp = await spotifyGet(token, `/playlists/${playlistId}?fields=id,name,description,owner(display_name),public,followers(total),items(total,items(item(name,artists(name),uri,duration_ms)))`);
  const p = resp.json();
  const lines: string[] = [
    `Playlist: ${p.name}`,
    `Description: ${p.description || "none"}`,
    `Owner: ${p.owner?.display_name || "unknown"}`,
    `Public: ${p.public ?? "N/A"}`,
    `Followers: ${p.followers?.total ?? 0}`,
    `Tracks (${p.items?.total || 0}):`,
  ];
  const trackItems = p.items?.items || [];
  trackItems.slice(0, 30).forEach((entry: any, i: number) => {
    const t = entry.item;
    if (!t) return;
    const artists = t.artists?.map((a: any) => a.name).join(", ") || "Unknown";
    lines.push(`  ${i + 1}. ${t.name} — ${artists} (${t.uri})`);
  });
  if (trackItems.length > 30) {
    lines.push(`  ...and ${trackItems.length - 30} more`);
  }
  return lines.join("\n");
}

export async function createPlaylist(token: string, input: Record<string, unknown>): Promise<string> {
  const name = required(input, "name");
  const description = optional(input, "description", "");
  const isPublic = optional<string>(input, "public", "false");

  const resp = await spotifyPost(token, `/me/playlists`, {
    name,
    description,
    public: isPublic === "true",
  });
  if (!resp.ok) {
    return `Failed to create playlist: ${resp.text()}`;
  }
  const p = resp.json();
  return `Created playlist "${p.name}" (${p.id})`;
}

export async function addToPlaylist(token: string, input: Record<string, unknown>): Promise<string> {
  const playlistId = required(input, "playlist_id");
  const uris = required(input, "uris");
  const uriList = uris.split(",").map((u: string) => u.trim());
  const resp = await spotifyPost(token, `/playlists/${playlistId}/items`, { uris: uriList });
  if (!resp.ok) return `Failed to add tracks: ${resp.text()}`;
  return `Added ${uriList.length} track(s) to playlist.`;
}

export async function removeFromPlaylist(token: string, input: Record<string, unknown>): Promise<string> {
  const playlistId = required(input, "playlist_id");
  const uris = required(input, "uris");
  const uriList = uris.split(",").map((u: string) => u.trim());
  const items = uriList.map((uri: string) => ({ uri }));
  const resp = await spotifyDelete(token, `/playlists/${playlistId}/items`, { items });
  if (!resp.ok) return `Failed to remove tracks: ${resp.text()}`;
  return `Removed ${uriList.length} track(s) from playlist.`;
}

export async function updatePlaylistDetails(token: string, input: Record<string, unknown>): Promise<string> {
  const playlistId = required(input, "playlist_id");
  const body: Record<string, unknown> = {};
  const name = optional<string>(input, "name", "");
  const description = optional<string>(input, "description", "");
  const isPublic = optional<string>(input, "public", "");
  if (name) body.name = name;
  if (description) body.description = description;
  if (isPublic) body.public = isPublic === "true";
  if (Object.keys(body).length === 0) return "No fields to update. Provide name, description, or public.";
  const resp = await spotifyPut(token, `/playlists/${playlistId}`, body);
  if (!resp.ok) return `Failed to update playlist: ${resp.text()}`;
  return `Playlist ${playlistId} updated.`;
}

export async function getPlaylistItems(token: string, input: Record<string, unknown>): Promise<string> {
  const playlistId = required(input, "playlist_id");
  const limit = optional(input, "limit", 50);
  const offset = optional(input, "offset", 0);
  const resp = await spotifyGet(token, `/playlists/${playlistId}/items?limit=${limit}&offset=${offset}`);
  if (!resp.ok) return `Failed to get playlist items: ${resp.text()}`;
  const paging = resp.json();
  const items = paging.items || [];
  if (!items.length) return "No tracks in this playlist.";
  const lines = items.map((entry: any, i: number) => {
    const t = entry.item || entry.track;
    if (!t) return `${Number(offset) + i + 1}. [unavailable track]`;
    const artists = t.artists?.map((a: any) => a.name).join(", ") || "Unknown";
    return `${Number(offset) + i + 1}. ${t.name} — ${artists} [${t.album?.name || ""}] (${t.uri})`;
  });
  return `Playlist tracks (${paging.total || 0} total, showing ${offset}–${Number(offset) + items.length}):\n${lines.join("\n")}`;
}

export async function reorderPlaylistItems(token: string, input: Record<string, unknown>): Promise<string> {
  const playlistId = required(input, "playlist_id");
  const rangeStart = Number(required(input, "range_start"));
  const insertBefore = Number(required(input, "insert_before"));
  const rangeLength = optional(input, "range_length", 1);
  const resp = await spotifyPut(token, `/playlists/${playlistId}/items`, {
    range_start: rangeStart,
    insert_before: insertBefore,
    range_length: Number(rangeLength),
  });
  if (!resp.ok) return `Failed to reorder tracks: ${resp.text()}`;
  return `Moved ${rangeLength} track(s) from position ${rangeStart} to before position ${insertBefore}.`;
}

export async function replacePlaylistItems(token: string, input: Record<string, unknown>): Promise<string> {
  const playlistId = required(input, "playlist_id");
  const uris = required(input, "uris");
  const uriList = uris.split(",").map((u: string) => u.trim());
  const resp = await spotifyPut(token, `/playlists/${playlistId}/items`, { uris: uriList });
  if (!resp.ok) return `Failed to replace tracks: ${resp.text()}`;
  return `Replaced playlist contents with ${uriList.length} track(s).`;
}

export async function getPlaylistCoverImage(token: string, input: Record<string, unknown>): Promise<string> {
  const playlistId = required(input, "playlist_id");
  const resp = await spotifyGet(token, `/playlists/${playlistId}/images`);
  const images = resp.json();
  if (!images || !images.length) return "No cover image set.";
  const lines = images.map((img: any) => `${img.width || "?"}x${img.height || "?"}: ${img.url}`);
  return `Cover images:\n${lines.join("\n")}`;
}

export async function setPlaylistCoverImage(token: string, input: Record<string, unknown>): Promise<string> {
  const playlistId = required(input, "playlist_id");
  const imageBase64 = required(input, "image_base64");
  await spotifyPutRaw(token, `/playlists/${playlistId}/images`, imageBase64, "image/jpeg");
  return "Playlist cover image updated.";
}
