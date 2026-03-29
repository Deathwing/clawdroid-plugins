// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { spotifyGet } from "../api";
import { required, optional } from "../params";
import type { SpotifySearchResult } from "../types";

export async function search(token: string, input: Record<string, unknown>): Promise<string> {
  const query = required(input, "query");
  const type = optional(input, "type", "track");
  const limit = optional(input, "limit", 10);
  const encoded = encodeURIComponent(query);
  const resp = await spotifyGet(token, `/search?q=${encoded}&type=${type}&limit=${limit}`);
  const result: SpotifySearchResult = resp.json();
  const lines: string[] = [];

  if (result.tracks && result.tracks.items.length > 0) {
    lines.push(`Tracks (${result.tracks.total} total):`);
    result.tracks.items.forEach((t, i) => {
      const artists = t.artists.map((a) => a.name).join(", ");
      lines.push(`${i + 1}. ${t.name} — ${artists} [${t.album.name}] (${t.uri})`);
    });
  }

  if (result.albums && result.albums.items.length > 0) {
    lines.push(`\nAlbums (${result.albums.total} total):`);
    result.albums.items.forEach((a, i) => {
      const artists = a.artists.map((ar) => ar.name).join(", ");
      lines.push(`${i + 1}. ${a.name} — ${artists} (${a.release_date}) [spotify:album:${a.id}]`);
    });
  }

  if (result.artists && result.artists.items.length > 0) {
    lines.push(`\nArtists (${result.artists.total} total):`);
    result.artists.items.forEach((a, i) => {
      const genres = a.genres && a.genres.length > 0 ? ` (${a.genres.slice(0, 3).join(", ")})` : "";
      lines.push(`${i + 1}. ${a.name}${genres} [spotify:artist:${a.id}]`);
    });
  }

  if (result.playlists && result.playlists.items.length > 0) {
    lines.push(`\nPlaylists (${result.playlists.total} total):`);
    result.playlists.items.forEach((p, i) => {
      lines.push(`${i + 1}. ${p.name} by ${p.owner.display_name} (${p.tracks.total} tracks) [spotify:playlist:${p.id}]`);
    });
  }

  if (lines.length === 0) return "No results found.";
  return lines.join("\n");
}
