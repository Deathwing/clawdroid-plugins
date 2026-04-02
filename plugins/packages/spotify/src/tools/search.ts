// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { ensureOk, spotifyGet } from "../api";
import { required, optional } from "../params";
import type { SpotifySearchResult } from "../types";
import {
  artistNames,
  clipText,
  pluralize,
  spotifyUri,
  statusBlock,
  successResult,
  tableBlock,
  textBlock,
} from "../result";

export async function search(token: string, input: Record<string, unknown>) {
  const query = required(input, "query");
  const type = optional(input, "type", "track");
  const limit = optional(input, "limit", 10);
  const encoded = encodeURIComponent(query);
  const result = ensureOk(
    await spotifyGet(token, `/search?q=${encoded}&type=${type}&limit=${limit}`),
    `Searching Spotify for "${query}"`,
  ).json() as SpotifySearchResult;

  const sections: string[] = [];
  const blocks = [];
  let shownCount = 0;

  const tracks = result.tracks?.items ?? [];
  if (tracks.length > 0) {
    const rows = tracks.map((track, index) => [
      String(index + 1),
      clipText(track.name, 48),
      clipText(artistNames(track.artists), 36),
      clipText(track.album?.name ?? "Unknown", 32),
      track.uri,
    ]);
    const lines = tracks.map(
      (track, index) => `${index + 1}. ${track.name} — ${artistNames(track.artists)} [${track.album?.name ?? "Unknown"}] (${track.uri})`,
    );
    sections.push(`Tracks (${result.tracks?.total ?? tracks.length} total):\n${lines.join("\n")}`);
    blocks.push(textBlock(`Tracks (${result.tracks?.total ?? tracks.length} total):`));
    blocks.push(tableBlock(["#", "Track", "Artists", "Album", "URI"], rows));
    shownCount += tracks.length;
  }

  const albums = result.albums?.items ?? [];
  if (albums.length > 0) {
    const rows = albums.map((album, index) => [
      String(index + 1),
      clipText(album.name, 48),
      clipText(artistNames(album.artists), 36),
      album.release_date ?? "-",
      album.uri ?? spotifyUri("album", album.id),
    ]);
    const lines = albums.map(
      (album, index) => `${index + 1}. ${album.name} — ${artistNames(album.artists)} (${album.release_date ?? "unknown"}) [${album.uri ?? spotifyUri("album", album.id)}]`,
    );
    sections.push(`Albums (${result.albums?.total ?? albums.length} total):\n${lines.join("\n")}`);
    blocks.push(textBlock(`Albums (${result.albums?.total ?? albums.length} total):`));
    blocks.push(tableBlock(["#", "Album", "Artists", "Released", "URI"], rows));
    shownCount += albums.length;
  }

  const artists = result.artists?.items ?? [];
  if (artists.length > 0) {
    const rows = artists.map((artist, index) => [
      String(index + 1),
      clipText(artist.name, 42),
      clipText((artist.genres ?? []).slice(0, 3).join(", ") || "-", 32),
      artist.popularity === undefined ? "-" : `${artist.popularity}/100`,
      artist.uri ?? spotifyUri("artist", artist.id),
    ]);
    const lines = artists.map((artist, index) => {
      const genres = artist.genres && artist.genres.length > 0 ? ` (${artist.genres.slice(0, 3).join(", ")})` : "";
      return `${index + 1}. ${artist.name}${genres} [${artist.uri ?? spotifyUri("artist", artist.id)}]`;
    });
    sections.push(`Artists (${result.artists?.total ?? artists.length} total):\n${lines.join("\n")}`);
    blocks.push(textBlock(`Artists (${result.artists?.total ?? artists.length} total):`));
    blocks.push(tableBlock(["#", "Artist", "Genres", "Popularity", "URI"], rows));
    shownCount += artists.length;
  }

  const playlists = result.playlists?.items ?? [];
  if (playlists.length > 0) {
    const rows = playlists.map((playlist, index) => [
      String(index + 1),
      clipText(playlist.name, 42),
      clipText(playlist.owner.display_name ?? playlist.owner.id ?? "Unknown", 28),
      String(playlist.items?.total ?? playlist.tracks?.total ?? 0),
      playlist.uri ?? spotifyUri("playlist", playlist.id),
    ]);
    const lines = playlists.map(
      (playlist, index) => `${index + 1}. ${playlist.name} by ${playlist.owner.display_name ?? playlist.owner.id ?? "Unknown"} (${playlist.items?.total ?? playlist.tracks?.total ?? 0} tracks) [${playlist.uri ?? spotifyUri("playlist", playlist.id)}]`,
    );
    sections.push(`Playlists (${result.playlists?.total ?? playlists.length} total):\n${lines.join("\n")}`);
    blocks.push(textBlock(`Playlists (${result.playlists?.total ?? playlists.length} total):`));
    blocks.push(tableBlock(["#", "Playlist", "Owner", "Tracks", "URI"], rows));
    shownCount += playlists.length;
  }

  if (shownCount === 0) {
    return successResult(
      "No results found.",
      "No results found",
      [statusBlock(`No results found for "${query}".`)],
    );
  }

  return successResult(
    sections.join("\n\n"),
    `${shownCount} ${pluralize(shownCount, "result")} for "${query}"`,
    [statusBlock(`Found ${shownCount} ${pluralize(shownCount, "result")} for "${query}".`), ...blocks],
  );
}
