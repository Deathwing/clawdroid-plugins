// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { ytGet, ytPost, ytDelete } from "../api";
import { required, optional } from "../params";
import type { YtListResponse, YtPlaylist, YtPlaylistItem } from "../types";
import { clipText, keyValueTable, pluralize, statusBlock, successResult, tableBlock, textBlock } from "../result";
import { videoUrl } from "../urls";

export async function listMyPlaylists(token: string, input: Record<string, unknown>) {
  const maxResults = optional(input, "max_results", 25);
  const resp = await ytGet(token, `/playlists?part=snippet,contentDetails,status&mine=true&maxResults=${maxResults}`);
  const data = resp.json() as YtListResponse<YtPlaylist>;

  if (!data.items || data.items.length === 0) {
    return successResult("No playlists found.", "No playlists found", [statusBlock("No playlists found.")]);
  }

  const lines = [`Your playlists (${data.pageInfo?.totalResults ?? data.items.length} total):\n`];
  const rows: string[][] = [];
  data.items.forEach((p, i) => {
    const count = p.contentDetails?.itemCount ?? 0;
    const privacy = p.status?.privacyStatus ?? "unknown";
    lines.push(`${i + 1}. ${p.snippet.title} (${count} videos, ${privacy})`);
    lines.push(`   ID: ${p.id}`);
    if (p.snippet.description) {
      lines.push(`   ${p.snippet.description.slice(0, 100)}${p.snippet.description.length > 100 ? "..." : ""}`);
    }
    lines.push("");
    rows.push([
      String(i + 1),
      clipText(p.snippet.title, 48),
      String(count),
      privacy,
      p.id,
    ]);
  });

  const count = data.items.length;
  return successResult(
    lines.join("\n").trim(),
    `${count} ${pluralize(count, "playlist")} found`,
    [
      statusBlock(`Found ${count} ${pluralize(count, "playlist")}.`),
      tableBlock(["#", "Title", "Videos", "Privacy", "ID"], rows),
    ],
  );
}

export async function getPlaylistItems(token: string, input: Record<string, unknown>) {
  const playlistId = required(input, "playlist_id");
  const maxResults = optional(input, "max_results", 25);
  const resp = await ytGet(
    token,
    `/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${maxResults}`,
  );
  const data = resp.json() as YtListResponse<YtPlaylistItem>;

  if (!data.items || data.items.length === 0) {
    return successResult(
      "Playlist is empty or not found.",
      "Playlist is empty",
      [statusBlock(`Playlist ${playlistId} is empty or not accessible.`)],
    );
  }

  const lines = [`Playlist contents (${data.pageInfo?.totalResults ?? data.items.length} videos):\n`];
  const rows: string[][] = [];
  data.items.forEach((item, i) => {
    const s = item.snippet;
    const videoId = s.resourceId.videoId;
    lines.push(`${i + 1}. ${s.title}`);
    lines.push(`   Video ID: ${videoId} | Playlist Item ID: ${item.id}`);
    lines.push(`   ${videoUrl(videoId)}`);
    lines.push("");
    rows.push([
      String(i + 1),
      clipText(s.title, 52),
      videoId,
      item.id,
    ]);
  });

  const count = data.items.length;
  return successResult(
    lines.join("\n").trim(),
    `${count} ${pluralize(count, "playlist item")} in ${playlistId}`,
    [
      statusBlock(`Loaded ${count} ${pluralize(count, "playlist item")} from ${playlistId}.`),
      tableBlock(["#", "Title", "Video ID", "Playlist Item ID"], rows),
    ],
  );
}

export async function addToPlaylist(token: string, input: Record<string, unknown>) {
  const playlistId = required(input, "playlist_id");
  const videoId = required(input, "video_id");

  const snippetBody: Record<string, unknown> = {
    playlistId,
    resourceId: { kind: "youtube#video", videoId },
  };
  const positionVal = input["position"];
  if (positionVal !== undefined && positionVal !== null && positionVal !== "") {
    snippetBody["position"] = Number(positionVal);
  }

  const resp = await ytPost(token, `/playlistItems?part=snippet`, { snippet: snippetBody });
  const data = resp.json() as YtPlaylistItem;

  const message = `Added video ${videoId} to playlist ${playlistId} at position ${data.snippet?.position ?? "end"}.`;
  return successResult(
    message,
    `Added ${videoId} to ${playlistId}`,
    [
      statusBlock(message),
      keyValueTable([
        ["Playlist ID", playlistId],
        ["Video ID", videoId],
        ["Position", String(data.snippet?.position ?? "end")],
      ]),
    ],
  );
}

export async function createPlaylist(token: string, input: Record<string, unknown>) {
  const title = required(input, "title");
  const description = optional(input, "description", "");
  const privacyStatus = optional(input, "privacy", "public");

  if (!["public", "private", "unlisted"].includes(privacyStatus)) {
    throw new Error(`Invalid privacy "${privacyStatus}". Must be "public", "private", or "unlisted".`);
  }

  const resp = await ytPost(token, `/playlists?part=snippet,status`, {
    snippet: { title, description },
    status: { privacyStatus },
  });
  const data = resp.json() as YtPlaylist;

  const message = `Playlist created!\nTitle: ${data.snippet.title}\nID: ${data.id}\nPrivacy: ${privacyStatus}`;
  const blocks = [
    statusBlock(`Created playlist ${data.snippet.title}.`),
    keyValueTable([
      ["Title", data.snippet.title],
      ["ID", data.id],
      ["Privacy", privacyStatus],
    ]),
  ];
  const descriptionText = clipText(data.snippet.description || description, 240);
  if (descriptionText) {
    blocks.push(textBlock(descriptionText));
  }
  return successResult(message, `Created playlist ${clipText(data.snippet.title, 64)}`, blocks);
}

export async function removeFromPlaylist(token: string, input: Record<string, unknown>) {
  const playlistItemId = required(input, "playlist_item_id");
  await ytDelete(token, `/playlistItems?id=${playlistItemId}`);
  const message = `Removed playlist item ${playlistItemId}.`;
  return successResult(message, `Removed ${playlistItemId}`, [statusBlock(message)]);
}
