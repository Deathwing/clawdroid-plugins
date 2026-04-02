// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { ensureOk, spotifyGet } from "../api";
import { required, optional } from "../params";
import type { SpotifyAlbum, SpotifyArtist, SpotifyPaging, SpotifyTrack } from "../types";
import {
  artistNames,
  clipText,
  formatDuration,
  formatNumber,
  keyValueTable,
  pluralize,
  spotifyUri,
  statusBlock,
  successResult,
  tableBlock,
} from "../result";

type SpotifyAlbumDetails = SpotifyAlbum & {
  tracks?: SpotifyPaging<SpotifyTrack>;
};

export async function getTrack(token: string, input: Record<string, unknown>) {
  const trackId = required(input, "track_id");
  const track = ensureOk(await spotifyGet(token, `/tracks/${trackId}`), `Loading track ${trackId}`).json() as SpotifyTrack;
  const artists = artistNames(track.artists);
  const message = [
    `Track: ${track.name}`,
    `Artists: ${artists}`,
    `Album: ${track.album?.name ?? "Unknown"}${track.album?.release_date ? ` (${track.album.release_date})` : ""}`,
    `Duration: ${formatDuration(track.duration_ms)}`,
    `Track #: ${track.track_number ?? "?"} / Disc ${track.disc_number ?? 1}`,
    `Popularity: ${track.popularity ?? 0}/100`,
    `Explicit: ${track.explicit ? "Yes" : "No"}`,
    `URI: ${track.uri}`,
    `Preview: ${track.preview_url ?? "none"}`,
  ].join("\n");

  return successResult(message, `Track ${clipText(track.name, 64)}`, [
    statusBlock(`Loaded track ${track.name}.`),
    keyValueTable([
      ["Name", track.name],
      ["Artists", artists],
      ["Album", track.album?.name ?? "Unknown"],
      ["Duration", formatDuration(track.duration_ms)],
      ["Track #", String(track.track_number ?? "?")],
      ["Disc #", String(track.disc_number ?? 1)],
      ["Popularity", `${track.popularity ?? 0}/100`],
      ["Explicit", track.explicit ? "Yes" : "No"],
      ["URI", track.uri],
      ["Preview", track.preview_url ?? ""],
    ]),
  ]);
}

export async function getAlbum(token: string, input: Record<string, unknown>) {
  const albumId = required(input, "album_id");
  const album = ensureOk(await spotifyGet(token, `/albums/${albumId}`), `Loading album ${albumId}`).json() as SpotifyAlbumDetails;
  const artists = artistNames(album.artists);
  const tracks = album.tracks?.items ?? [];
  const lines: string[] = [
    `Album: ${album.name}`,
    `Artist: ${artists}`,
    `Type: ${album.album_type ?? "unknown"} | Released: ${album.release_date ?? "unknown"}`,
    `Total tracks: ${album.total_tracks ?? tracks.length}`,
    `Popularity: ${album.popularity ?? 0}/100`,
    `Label: ${album.label ?? "unknown"}`,
    `URI: ${album.uri ?? spotifyUri("album", album.id)}`,
  ];
  if (tracks.length > 0) {
    lines.push("");
    lines.push(`Tracks (${tracks.length} shown):`);
    tracks.forEach((track, index) => {
      lines.push(`${index + 1}. ${track.name} — ${artistNames(track.artists)} (${formatDuration(track.duration_ms)}) [${track.uri}]`);
    });
  }

  const blocks = [
    statusBlock(`Loaded album ${album.name}.`),
    keyValueTable([
      ["Name", album.name],
      ["Artists", artists],
      ["Type", album.album_type ?? "unknown"],
      ["Released", album.release_date ?? "unknown"],
      ["Total Tracks", String(album.total_tracks ?? tracks.length)],
      ["Popularity", `${album.popularity ?? 0}/100`],
      ["Label", album.label ?? "unknown"],
      ["URI", album.uri ?? spotifyUri("album", album.id)],
    ]),
  ];
  if (tracks.length > 0) {
    blocks.push(tableBlock(
      ["#", "Track", "Artists", "Duration", "URI"],
      tracks.map((track, index) => [
        String(index + 1),
        clipText(track.name, 48),
        clipText(artistNames(track.artists), 36),
        formatDuration(track.duration_ms),
        track.uri,
      ]),
    ));
  }

  return successResult(lines.join("\n"), `Album ${clipText(album.name, 64)}`, blocks);
}

export async function getArtist(token: string, input: Record<string, unknown>) {
  const artistId = required(input, "artist_id");
  const artist = ensureOk(await spotifyGet(token, `/artists/${artistId}`), `Loading artist ${artistId}`).json() as SpotifyArtist;
  const genres = artist.genres?.length ? artist.genres.join(", ") : "none";
  const message = [
    `Artist: ${artist.name}`,
    `Genres: ${genres}`,
    `Followers: ${formatNumber(artist.followers?.total ?? 0)}`,
    `Popularity: ${artist.popularity ?? 0}/100`,
    `URI: ${artist.uri ?? spotifyUri("artist", artist.id)}`,
  ].join("\n");
  return successResult(message, `Artist ${clipText(artist.name, 64)}`, [
    statusBlock(`Loaded artist ${artist.name}.`),
    keyValueTable([
      ["Name", artist.name],
      ["Genres", genres],
      ["Followers", formatNumber(artist.followers?.total ?? 0)],
      ["Popularity", `${artist.popularity ?? 0}/100`],
      ["URI", artist.uri ?? spotifyUri("artist", artist.id)],
    ]),
  ]);
}

export async function getArtistTopTracks(token: string, input: Record<string, unknown>) {
  const artistId = required(input, "artist_id");
  const market = optional<string>(input, "market", "US");
  const tracks = ensureOk(
    await spotifyGet(token, `/artists/${artistId}/top-tracks?market=${market}`),
    `Loading top tracks for artist ${artistId}`,
  ).json() as { tracks?: SpotifyTrack[] };
  const items = tracks.tracks ?? [];
  if (!items.length) {
    return successResult("No top tracks found.", "No top tracks", [statusBlock(`No top tracks found for artist ${artistId}.`)]);
  }

  const rows = items.map((track, index) => [
    String(index + 1),
    clipText(track.name, 48),
    clipText(artistNames(track.artists), 36),
    clipText(track.album?.name ?? "Unknown", 32),
    track.uri,
  ]);
  const lines = rows.map((row) => `${row[0]}. ${row[1]} — ${row[2]} [${row[3]}] (${row[4]})`);
  return successResult(
    `Top tracks:\n${lines.join("\n")}`,
    `${items.length} top ${pluralize(items.length, "track")}`,
    [
      statusBlock(`Loaded ${items.length} top ${pluralize(items.length, "track")} for artist ${artistId}.`),
      tableBlock(["#", "Track", "Artists", "Album", "URI"], rows),
    ],
  );
}

export async function getArtistAlbums(token: string, input: Record<string, unknown>) {
  const artistId = required(input, "artist_id");
  const includeGroups = optional<string>(input, "include_groups", "album,single");
  const limit = optional(input, "limit", 20);
  const paging = ensureOk(
    await spotifyGet(token, `/artists/${artistId}/albums?include_groups=${includeGroups}&limit=${limit}`),
    `Loading albums for artist ${artistId}`,
  ).json() as SpotifyPaging<SpotifyAlbum>;
  const items = paging.items ?? [];
  if (!items.length) {
    return successResult("No albums found.", "No albums", [statusBlock(`No albums found for artist ${artistId}.`)]);
  }

  const rows = items.map((album, index) => [
    String(index + 1),
    clipText(album.name, 46),
    album.album_type ?? "unknown",
    album.release_date ?? "unknown",
    String(album.total_tracks ?? 0),
    album.uri ?? spotifyUri("album", album.id),
  ]);
  const lines = rows.map((row) => `${row[0]}. ${row[1]} (${row[2]}, ${row[3]}) — ${row[4]} tracks [${row[5]}]`);
  return successResult(
    `Albums (${formatNumber(paging.total, String(items.length))} total):\n${lines.join("\n")}`,
    `${items.length} ${pluralize(items.length, "album")} found`,
    [
      statusBlock(`Loaded ${items.length} ${pluralize(items.length, "album")} for artist ${artistId}.`),
      tableBlock(["#", "Album", "Type", "Released", "Tracks", "URI"], rows),
    ],
  );
}

export async function getRelatedArtists(token: string, input: Record<string, unknown>) {
  const artistId = required(input, "artist_id");
  const data = ensureOk(
    await spotifyGet(token, `/artists/${artistId}/related-artists`),
    `Loading related artists for ${artistId}`,
  ).json() as { artists?: SpotifyArtist[] };
  const items = (data.artists ?? []).slice(0, 20);
  if (!items.length) {
    return successResult(
      "No related artists found.",
      "No related artists",
      [statusBlock(`No related artists found for ${artistId}.`)],
    );
  }

  const rows = items.map((artist, index) => [
    String(index + 1),
    clipText(artist.name, 42),
    clipText((artist.genres ?? []).slice(0, 2).join(", ") || "-", 28),
    formatNumber(artist.followers?.total ?? 0),
    artist.uri ?? spotifyUri("artist", artist.id),
  ]);
  const lines = rows.map((row) => `${row[0]}. ${row[1]} (${row[2]}) — ${row[3]} followers [${row[4]}]`);
  return successResult(
    `Related artists:\n${lines.join("\n")}`,
    `${items.length} related ${pluralize(items.length, "artist")}`,
    [
      statusBlock(`Loaded ${items.length} related ${pluralize(items.length, "artist")}.`),
      tableBlock(["#", "Artist", "Genres", "Followers", "URI"], rows),
    ],
  );
}

export async function getRecommendations(token: string, input: Record<string, unknown>) {
  const seedTracks = optional<string>(input, "seed_tracks", "");
  const seedArtists = optional<string>(input, "seed_artists", "");
  const seedGenres = optional<string>(input, "seed_genres", "");
  const limit = optional(input, "limit", 20);
  if (!seedTracks && !seedArtists && !seedGenres) {
    throw new Error("Provide at least one of: seed_tracks, seed_artists, or seed_genres.");
  }
  const params: string[] = [`limit=${limit}`];
  if (seedTracks) params.push(`seed_tracks=${encodeURIComponent(seedTracks)}`);
  if (seedArtists) params.push(`seed_artists=${encodeURIComponent(seedArtists)}`);
  if (seedGenres) params.push(`seed_genres=${encodeURIComponent(seedGenres)}`);
  const data = ensureOk(
    await spotifyGet(token, `/recommendations?${params.join("&")}`),
    "Loading recommendations",
  ).json() as { tracks?: SpotifyTrack[] };
  const tracks = data.tracks ?? [];
  if (!tracks.length) {
    return successResult("No recommendations found.", "No recommendations", [statusBlock("No recommendations found.")]);
  }

  const rows = tracks.map((track, index) => [
    String(index + 1),
    clipText(track.name, 48),
    clipText(artistNames(track.artists), 36),
    clipText(track.album?.name ?? "Unknown", 32),
    track.uri,
  ]);
  const lines = rows.map((row) => `${row[0]}. ${row[1]} — ${row[2]} [${row[3]}] (${row[4]})`);
  return successResult(
    `Recommendations:\n${lines.join("\n")}`,
    `${tracks.length} ${pluralize(tracks.length, "recommendation")}`,
    [
      statusBlock(`Loaded ${tracks.length} ${pluralize(tracks.length, "recommendation")}.`),
      keyValueTable([
        ["Seed Tracks", seedTracks],
        ["Seed Artists", seedArtists],
        ["Seed Genres", seedGenres],
      ]),
      tableBlock(["#", "Track", "Artists", "Album", "URI"], rows),
    ],
  );
}
