// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import {
  ensureOk,
  spotifyDelete,
  spotifyGet,
  spotifyPost,
  spotifyPut,
  spotifyPutRaw,
} from "../api";
import { required, optional } from "../params";
import type { SpotifyImage, SpotifyPaging, SpotifyPlaylist, SpotifyPlaylistDetails, SpotifyPlaylistTrackItem } from "../types";
import {
  artistNames,
  cleanText,
  clipText,
  formatDuration,
  formatNumber,
  keyValueTable,
  pluralize,
  spotifyUri,
  statusBlock,
  successResult,
  tableBlock,
  textBlock,
} from "../result";

function splitValues(rawValue: string): string[] {
  return rawValue.split(",").map((value) => value.trim()).filter((value) => value.length > 0);
}

function previewValueBlocks(label: string, values: string[]) {
  if (values.length === 0) {
    return [];
  }
  const visibleValues = values.slice(0, 10);
  const blocks = [
    textBlock(label),
    tableBlock(["#", "Value"], visibleValues.map((value, index) => [String(index + 1), value])),
  ];
  if (values.length > visibleValues.length) {
    blocks.push(textBlock(`Showing first ${visibleValues.length} of ${values.length} values.`));
  }
  return blocks;
}

function playlistTrackTotal(playlist: SpotifyPlaylist | SpotifyPlaylistDetails): number {
  return playlist.items?.total ?? playlist.tracks?.total ?? 0;
}

function playlistTrackItems(playlist: SpotifyPlaylistDetails): SpotifyPlaylistTrackItem[] {
  return playlist.items?.items ?? playlist.tracks?.items ?? [];
}

export async function listPlaylists(token: string, input: Record<string, unknown>) {
  const limit = optional(input, "limit", 20);
  const paging = ensureOk(await spotifyGet(token, `/me/playlists?limit=${limit}`), "Loading playlists")
    .json() as SpotifyPaging<SpotifyPlaylist>;
  if (!paging.items.length) {
    return successResult("No playlists found.", "No playlists found", [statusBlock("No playlists found.")]);
  }

  const lines = [`Your playlists (${formatNumber(paging.total, String(paging.items.length))} total):`, ""];
  const rows = paging.items.map((playlist, index) => {
    const visibility = playlist.public === undefined ? "Unknown" : playlist.public ? "Public" : "Private";
    const owner = playlist.owner.display_name ?? playlist.owner.id ?? "Unknown";
    const trackTotal = playlistTrackTotal(playlist);
    lines.push(`${index + 1}. ${playlist.name} — ${owner} (${trackTotal} tracks, ${visibility}) [${playlist.id}]`);
    return [
      String(index + 1),
      clipText(playlist.name, 42),
      clipText(owner, 28),
      String(trackTotal),
      visibility,
      playlist.id,
    ];
  });

  const count = paging.items.length;
  return successResult(
    lines.join("\n"),
    `${count} ${pluralize(count, "playlist")} found`,
    [
      statusBlock(`Found ${count} ${pluralize(count, "playlist")}.`),
      tableBlock(["#", "Playlist", "Owner", "Tracks", "Visibility", "ID"], rows),
    ],
  );
}

export async function getPlaylist(token: string, input: Record<string, unknown>) {
  const playlistId = required(input, "playlist_id");
  const playlist = ensureOk(
    await spotifyGet(
      token,
      `/playlists/${playlistId}?fields=id,name,description,owner(display_name,id),public,followers(total),uri,items(total,items(item(id,name,artists(name),album(name),uri,duration_ms))),tracks(total,items(track(id,name,artists(name),album(name),uri,duration_ms)))`,
    ),
    `Loading playlist ${playlistId}`,
  ).json() as SpotifyPlaylistDetails;

  const description = cleanText(playlist.description);
  const owner = playlist.owner.display_name ?? playlist.owner.id ?? "Unknown";
  const visibility = playlist.public === undefined ? "Unknown" : playlist.public ? "Public" : "Private";
  const items = playlistTrackItems(playlist);
  const visibleItems = items.slice(0, 30);
  const rows = visibleItems.map((entry: SpotifyPlaylistTrackItem, index: number) => {
    const track = entry.track ?? entry.item;
    if (!track) {
      return [String(index + 1), "[unavailable track]", "-", "-", "-"];
    }
    return [
      String(index + 1),
      clipText(track.name, 48),
      clipText(artistNames(track.artists), 36),
      formatDuration(track.duration_ms),
      track.uri,
    ];
  });

  const lines: string[] = [
    `Playlist: ${playlist.name}`,
    `Owner: ${owner}`,
    `Visibility: ${visibility}`,
    `Followers: ${formatNumber(playlist.followers?.total ?? 0)}`,
    `Tracks: ${formatNumber(playlistTrackTotal(playlist), String(items.length))}`,
    `ID: ${playlist.id}`,
  ];
  if (description) {
    lines.push(`Description: ${description}`);
  }
  if (rows.length === 0) {
    lines.push("No tracks in this playlist.");
  } else {
    lines.push("");
    lines.push(`Tracks (${formatNumber(playlistTrackTotal(playlist), String(rows.length))} total):`);
    rows.forEach((row) => {
      lines.push(`${row[0]}. ${row[1]} — ${row[2]} (${row[4]})`);
    });
  }
  if (playlistTrackTotal(playlist) > rows.length) {
    lines.push(`Showing first ${rows.length} tracks.`);
  }

  const blocks = [
    statusBlock(`Loaded playlist ${playlist.name}.`),
    keyValueTable([
      ["Name", playlist.name],
      ["Owner", owner],
      ["Visibility", visibility],
      ["Followers", formatNumber(playlist.followers?.total ?? 0)],
      ["Tracks", formatNumber(playlistTrackTotal(playlist), String(items.length))],
      ["ID", playlist.id],
      ["URI", playlist.uri ?? spotifyUri("playlist", playlist.id)],
    ]),
  ];
  if (description) {
    blocks.push(textBlock(description));
  }
  if (rows.length > 0) {
    blocks.push(textBlock(`Tracks (${formatNumber(playlistTrackTotal(playlist), String(rows.length))} total):`));
    blocks.push(tableBlock(["#", "Track", "Artists", "Duration", "URI"], rows));
    if (playlistTrackTotal(playlist) > rows.length) {
      blocks.push(textBlock(`Showing first ${rows.length} tracks.`));
    }
  } else {
    blocks.push(textBlock("This playlist has no tracks."));
  }

  return successResult(lines.join("\n"), `Playlist ${clipText(playlist.name, 64)}`, blocks);
}

export async function createPlaylist(token: string, input: Record<string, unknown>) {
  const name = required(input, "name");
  const description = optional(input, "description", "");
  const isPublic = optional<string>(input, "public", "false");

  if (isPublic !== "true" && isPublic !== "false") {
    throw new Error("public must be 'true' or 'false'.");
  }

  const playlist = ensureOk(
    await spotifyPost(token, `/me/playlists`, {
      name,
      description,
      public: isPublic === "true",
    }),
    `Creating playlist ${name}`,
  ).json() as SpotifyPlaylist;

  const cleanedDescription = cleanText(playlist.description ?? description);
  const visibility = playlist.public ? "Public" : "Private";
  const message = `Created playlist "${playlist.name}" (${playlist.id}).`;
  const blocks = [
    statusBlock(`Created playlist ${playlist.name}.`),
    keyValueTable([
      ["Name", playlist.name],
      ["ID", playlist.id],
      ["Visibility", visibility],
      ["URI", playlist.uri ?? spotifyUri("playlist", playlist.id)],
    ]),
  ];
  if (cleanedDescription) {
    blocks.push(textBlock(cleanedDescription));
  }
  return successResult(message, `Created ${clipText(playlist.name, 64)}`, blocks);
}

export async function addToPlaylist(token: string, input: Record<string, unknown>) {
  const playlistId = required(input, "playlist_id");
  const uriList = splitValues(required(input, "uris"));
  if (uriList.length === 0) {
    throw new Error("uris must contain at least one Spotify URI.");
  }

  ensureOk(
    await spotifyPost(token, `/playlists/${playlistId}/items`, { uris: uriList }),
    `Adding tracks to playlist ${playlistId}`,
  );

  const message = `Added ${uriList.length} ${pluralize(uriList.length, "track")} to playlist ${playlistId}.`;
  return successResult(message, `Added ${uriList.length} ${pluralize(uriList.length, "track")}`, [
    statusBlock(message),
    keyValueTable([
      ["Playlist ID", playlistId],
      ["Tracks Added", String(uriList.length)],
    ]),
    ...previewValueBlocks("Track URIs", uriList),
  ]);
}

export async function removeFromPlaylist(token: string, input: Record<string, unknown>) {
  const playlistId = required(input, "playlist_id");
  const uriList = splitValues(required(input, "uris"));
  if (uriList.length === 0) {
    throw new Error("uris must contain at least one Spotify URI.");
  }

  ensureOk(
    await spotifyDelete(token, `/playlists/${playlistId}/items`, {
      items: uriList.map((uri) => ({ uri })),
    }),
    `Removing tracks from playlist ${playlistId}`,
  );

  const message = `Removed ${uriList.length} ${pluralize(uriList.length, "track")} from playlist ${playlistId}.`;
  return successResult(message, `Removed ${uriList.length} ${pluralize(uriList.length, "track")}`, [
    statusBlock(message),
    keyValueTable([
      ["Playlist ID", playlistId],
      ["Tracks Removed", String(uriList.length)],
    ]),
    ...previewValueBlocks("Track URIs", uriList),
  ]);
}

export async function updatePlaylistDetails(token: string, input: Record<string, unknown>) {
  const playlistId = required(input, "playlist_id");
  const body: Record<string, unknown> = {};
  const name = optional<string>(input, "name", "");
  const description = optional<string>(input, "description", "");
  const isPublic = optional<string>(input, "public", "");
  if (name) body.name = name;
  if (description) body.description = description;
  if (isPublic) body.public = isPublic === "true";
  if (Object.keys(body).length === 0) {
    throw new Error("Provide at least one of: name, description, public.");
  }

  ensureOk(await spotifyPut(token, `/playlists/${playlistId}`, body), `Updating playlist ${playlistId}`);

  const message = `Playlist ${playlistId} updated.`;
  return successResult(message, `Updated ${playlistId}`, [
    statusBlock(message),
    keyValueTable([
      ["Playlist ID", playlistId],
      ["Name", name],
      ["Description", cleanText(description)],
      ["Public", isPublic ? (isPublic === "true" ? "true" : "false") : ""],
    ]),
  ]);
}

export async function getPlaylistItems(token: string, input: Record<string, unknown>) {
  const playlistId = required(input, "playlist_id");
  const limit = optional(input, "limit", 50);
  const offset = optional(input, "offset", 0);
  const paging = ensureOk(
    await spotifyGet(token, `/playlists/${playlistId}/items?limit=${limit}&offset=${offset}`),
    `Loading items for playlist ${playlistId}`,
  ).json() as SpotifyPaging<SpotifyPlaylistTrackItem>;
  const items = paging.items ?? [];
  if (!items.length) {
    return successResult(
      "No tracks in this playlist.",
      "Playlist is empty",
      [statusBlock(`Playlist ${playlistId} has no tracks in this page of results.`)],
    );
  }

  const numericOffset = Number(offset);
  const rows = items.map((entry, index) => {
    const track = entry.track ?? entry.item;
    if (!track) {
      return [String(numericOffset + index + 1), "[unavailable track]", "-", "-", "-"];
    }
    return [
      String(numericOffset + index + 1),
      clipText(track.name, 48),
      clipText(artistNames(track.artists), 36),
      clipText(track.album?.name ?? "Unknown", 32),
      track.uri,
    ];
  });
  const lines = rows.map((row) => `${row[0]}. ${row[1]} — ${row[2]} [${row[3]}] (${row[4]})`);
  return successResult(
    `Playlist tracks (${formatNumber(paging.total ?? items.length)} total, showing ${numericOffset + 1}-${numericOffset + items.length}):\n${lines.join("\n")}`,
    `${items.length} ${pluralize(items.length, "track")} from ${playlistId}`,
    [
      statusBlock(`Loaded ${items.length} ${pluralize(items.length, "track")} from playlist ${playlistId}.`),
      tableBlock(["#", "Track", "Artists", "Album", "URI"], rows),
    ],
  );
}

export async function reorderPlaylistItems(token: string, input: Record<string, unknown>) {
  const playlistId = required(input, "playlist_id");
  const rangeStart = Number(required(input, "range_start"));
  const insertBefore = Number(required(input, "insert_before"));
  const rangeLength = Number(optional(input, "range_length", 1));
  if (!Number.isInteger(rangeStart) || rangeStart < 0 || !Number.isInteger(insertBefore) || insertBefore < 0) {
    throw new Error("range_start and insert_before must be non-negative integers.");
  }
  if (!Number.isInteger(rangeLength) || rangeLength <= 0) {
    throw new Error("range_length must be a positive integer.");
  }

  ensureOk(await spotifyPut(token, `/playlists/${playlistId}/items`, {
    range_start: rangeStart,
    insert_before: insertBefore,
    range_length: rangeLength,
  }), `Reordering playlist ${playlistId}`);

  const message = `Moved ${rangeLength} ${pluralize(rangeLength, "track")} from position ${rangeStart} to before position ${insertBefore}.`;
  return successResult(message, `Moved ${rangeLength} ${pluralize(rangeLength, "track")}`, [
    statusBlock(message),
    keyValueTable([
      ["Playlist ID", playlistId],
      ["Range Start", String(rangeStart)],
      ["Insert Before", String(insertBefore)],
      ["Range Length", String(rangeLength)],
    ]),
  ]);
}

export async function replacePlaylistItems(token: string, input: Record<string, unknown>) {
  const playlistId = required(input, "playlist_id");
  const uriList = splitValues(required(input, "uris"));
  if (uriList.length === 0) {
    throw new Error("uris must contain at least one Spotify URI.");
  }

  ensureOk(
    await spotifyPut(token, `/playlists/${playlistId}/items`, { uris: uriList }),
    `Replacing items in playlist ${playlistId}`,
  );

  const message = `Replaced playlist contents with ${uriList.length} ${pluralize(uriList.length, "track")}.`;
  return successResult(message, `Replaced with ${uriList.length} ${pluralize(uriList.length, "track")}`, [
    statusBlock(message),
    keyValueTable([
      ["Playlist ID", playlistId],
      ["Tracks", String(uriList.length)],
    ]),
    ...previewValueBlocks("Track URIs", uriList),
  ]);
}

export async function getPlaylistCoverImage(token: string, input: Record<string, unknown>) {
  const playlistId = required(input, "playlist_id");
  const images = ensureOk(await spotifyGet(token, `/playlists/${playlistId}/images`), `Loading cover image for playlist ${playlistId}`)
    .json() as SpotifyImage[];
  if (!images || images.length === 0) {
    return successResult("No cover image set.", "No cover image", [statusBlock(`Playlist ${playlistId} has no custom cover image.`)]);
  }

  const rows = images.map((image, index) => [
    String(index + 1),
    `${image.width ?? "?"}x${image.height ?? "?"}`,
    image.url,
  ]);
  const lines = rows.map((row) => `${row[0]}. ${row[1]} — ${row[2]}`);
  return successResult(
    `Cover images:\n${lines.join("\n")}`,
    `${images.length} cover ${pluralize(images.length, "image")}`,
    [
      statusBlock(`Loaded ${images.length} cover ${pluralize(images.length, "image")} for playlist ${playlistId}.`),
      tableBlock(["#", "Size", "URL"], rows),
    ],
  );
}

export async function setPlaylistCoverImage(token: string, input: Record<string, unknown>) {
  const playlistId = required(input, "playlist_id");
  const imageBase64 = required(input, "image_base64");
  ensureOk(
    await spotifyPutRaw(token, `/playlists/${playlistId}/images`, imageBase64, "image/jpeg"),
    `Updating cover image for playlist ${playlistId}`,
  );

  const message = `Playlist cover image updated for ${playlistId}.`;
  return successResult(message, "Playlist cover updated", [
    statusBlock("Playlist cover image updated."),
    keyValueTable([["Playlist ID", playlistId]]),
  ]);
}
