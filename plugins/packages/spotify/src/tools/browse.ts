// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { spotifyGet } from "../api";
import { required, optional } from "../params";

export async function getTrack(token: string, input: Record<string, unknown>): Promise<string> {
  const trackId = required(input, "track_id");
  const resp = await spotifyGet(token, `/tracks/${trackId}`);
  const t = resp.json();
  const artists = t.artists?.map((a: any) => a.name).join(", ") || "Unknown";
  const mins = Math.floor(t.duration_ms / 60000);
  const secs = Math.floor((t.duration_ms % 60000) / 1000);
  return [
    `Track: ${t.name}`,
    `Artist: ${artists}`,
    `Album: ${t.album?.name || "unknown"} (${t.album?.release_date || ""})`,
    `Duration: ${mins}:${secs < 10 ? "0" : ""}${secs}`,
    `Track #: ${t.track_number} / Disc ${t.disc_number}`,
    `Popularity: ${t.popularity}/100`,
    `Explicit: ${t.explicit ? "yes" : "no"}`,
    `URI: ${t.uri}`,
    `Preview: ${t.preview_url || "none"}`,
  ].join("\n");
}

export async function getAlbum(token: string, input: Record<string, unknown>): Promise<string> {
  const albumId = required(input, "album_id");
  const resp = await spotifyGet(token, `/albums/${albumId}`);
  const a = resp.json();
  const artists = a.artists?.map((ar: any) => ar.name).join(", ") || "Unknown";
  const lines: string[] = [
    `Album: ${a.name}`,
    `Artist: ${artists}`,
    `Type: ${a.album_type} | Released: ${a.release_date}`,
    `Total tracks: ${a.total_tracks}`,
    `Popularity: ${a.popularity}/100`,
    `Label: ${a.label || "unknown"}`,
    `URI: spotify:album:${a.id}`,
    `\nTracks:`,
  ];
  const tracks = a.tracks?.items || [];
  tracks.forEach((t: any, i: number) => {
    const tArtists = t.artists?.map((ar: any) => ar.name).join(", ") || "";
    const mins = Math.floor(t.duration_ms / 60000);
    const secs = Math.floor((t.duration_ms % 60000) / 1000);
    lines.push(`  ${i + 1}. ${t.name} — ${tArtists} (${mins}:${secs < 10 ? "0" : ""}${secs}) [${t.uri}]`);
  });
  return lines.join("\n");
}

export async function getArtist(token: string, input: Record<string, unknown>): Promise<string> {
  const artistId = required(input, "artist_id");
  const resp = await spotifyGet(token, `/artists/${artistId}`);
  const a = resp.json();
  const genres = a.genres?.length > 0 ? a.genres.join(", ") : "none";
  return [
    `Artist: ${a.name}`,
    `Genres: ${genres}`,
    `Followers: ${a.followers?.total || 0}`,
    `Popularity: ${a.popularity}/100`,
    `URI: spotify:artist:${a.id}`,
  ].join("\n");
}

export async function getArtistTopTracks(token: string, input: Record<string, unknown>): Promise<string> {
  const artistId = required(input, "artist_id");
  const market = optional<string>(input, "market", "US");
  const resp = await spotifyGet(token, `/artists/${artistId}/top-tracks?market=${market}`);
  const data = resp.json();
  const tracks = data.tracks || [];
  if (!tracks.length) return "No top tracks found.";
  const lines = tracks.map((t: any, i: number) => {
    const artists = t.artists?.map((a: any) => a.name).join(", ") || "";
    return `${i + 1}. ${t.name} — ${artists} [${t.album?.name || ""}] (${t.uri})`;
  });
  return `Top tracks:\n${lines.join("\n")}`;
}

export async function getArtistAlbums(token: string, input: Record<string, unknown>): Promise<string> {
  const artistId = required(input, "artist_id");
  const includeGroups = optional<string>(input, "include_groups", "album,single");
  const limit = optional(input, "limit", 20);
  const resp = await spotifyGet(token, `/artists/${artistId}/albums?include_groups=${includeGroups}&limit=${limit}`);
  const paging = resp.json();
  const items = paging.items || [];
  if (!items.length) return "No albums found.";
  const lines = items.map((a: any, i: number) => {
    return `${i + 1}. ${a.name} (${a.album_type}, ${a.release_date}) — ${a.total_tracks} tracks [spotify:album:${a.id}]`;
  });
  return `Albums (${paging.total || items.length} total):\n${lines.join("\n")}`;
}

export async function getRelatedArtists(token: string, input: Record<string, unknown>): Promise<string> {
  const artistId = required(input, "artist_id");
  const resp = await spotifyGet(token, `/artists/${artistId}/related-artists`);
  const data = resp.json();
  const artists = data.artists || [];
  if (!artists.length) return "No related artists found.";
  const lines = artists.slice(0, 20).map((a: any, i: number) => {
    const genres = a.genres?.length > 0 ? ` (${a.genres.slice(0, 2).join(", ")})` : "";
    return `${i + 1}. ${a.name}${genres} — ${a.followers?.total || 0} followers [spotify:artist:${a.id}]`;
  });
  return `Related artists:\n${lines.join("\n")}`;
}

export async function getRecommendations(token: string, input: Record<string, unknown>): Promise<string> {
  const seedTracks = optional<string>(input, "seed_tracks", "");
  const seedArtists = optional<string>(input, "seed_artists", "");
  const seedGenres = optional<string>(input, "seed_genres", "");
  const limit = optional(input, "limit", 20);
  if (!seedTracks && !seedArtists && !seedGenres) {
    return "Provide at least one of: seed_tracks, seed_artists, or seed_genres.";
  }
  const params: string[] = [`limit=${limit}`];
  if (seedTracks) params.push(`seed_tracks=${encodeURIComponent(seedTracks)}`);
  if (seedArtists) params.push(`seed_artists=${encodeURIComponent(seedArtists)}`);
  if (seedGenres) params.push(`seed_genres=${encodeURIComponent(seedGenres)}`);
  const resp = await spotifyGet(token, `/recommendations?${params.join("&")}`);
  const data = resp.json();
  const tracks = data.tracks || [];
  if (!tracks.length) return "No recommendations found.";
  const lines = tracks.map((t: any, i: number) => {
    const artists = t.artists?.map((a: any) => a.name).join(", ") || "";
    return `${i + 1}. ${t.name} — ${artists} [${t.album?.name || ""}] (${t.uri})`;
  });
  return `Recommendations:\n${lines.join("\n")}`;
}
