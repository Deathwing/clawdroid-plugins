// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

/**
 * ClawDroid Spotify Plugin — entry point
 *
 * Exports:
 * - discoverTools() + execute() — tool execution
 */

import type { PluginContext, ToolResult, ToolError } from "../../../quickjs.d";
import { getPlayback, play, pause, next, previous, setVolume, setShuffle, setRepeat, addToQueue, getQueue } from "./tools/player";
import { search } from "./tools/search";
import { listPlaylists, getPlaylist, createPlaylist, addToPlaylist, removeFromPlaylist, updatePlaylistDetails, getPlaylistItems, reorderPlaylistItems, replacePlaylistItems, getPlaylistCoverImage, setPlaylistCoverImage } from "./tools/playlists";
import { getSavedTracks, saveTracks, removeSavedTracks, getTopItems, getRecentlyPlayed } from "./tools/library";
import { getTrack, getAlbum, getArtist, getArtistTopTracks, getArtistAlbums, getRelatedArtists, getRecommendations } from "./tools/browse";
import { errorResult } from "./result";

type ToolInput = Record<string, unknown>;

/** Tool definitions are declared in manifest.json — nothing to discover at runtime */
export function discoverTools(): [] {
  return [];
}

/**
 * Dispatch a tool call to the appropriate handler.
 * Called by JsPluginEngine with (toolName, input, { host }).
 */
export async function execute(
  toolName: string,
  input: ToolInput,
  ctx: PluginContext,
): Promise<ToolResult | ToolError> {
  const token = await ctx.host.getSecret("token");
  if (!token) {
    return errorResult(
      "Spotify not connected. Connect in Settings → Plugins → Spotify first.",
      "Spotify connection required",
    );
  }

  try {
    let result: ToolResult;
    switch (toolName) {
      // Player
      case "spotify_get_playback":
        result = await getPlayback(token);
        break;
      case "spotify_play":
        result = await play(token, input);
        break;
      case "spotify_pause":
        result = await pause(token);
        break;
      case "spotify_next":
        result = await next(token);
        break;
      case "spotify_previous":
        result = await previous(token);
        break;
      case "spotify_set_volume":
        result = await setVolume(token, input);
        break;
      case "spotify_set_shuffle":
        result = await setShuffle(token, input);
        break;
      case "spotify_set_repeat":
        result = await setRepeat(token, input);
        break;
      case "spotify_add_to_queue":
        result = await addToQueue(token, input);
        break;
      case "spotify_get_queue":
        result = await getQueue(token);
        break;
      // Search
      case "spotify_search":
        result = await search(token, input);
        break;
      // Playlists
      case "spotify_list_playlists":
        result = await listPlaylists(token, input);
        break;
      case "spotify_get_playlist":
        result = await getPlaylist(token, input);
        break;
      case "spotify_create_playlist":
        result = await createPlaylist(token, input);
        break;
      case "spotify_add_to_playlist":
        result = await addToPlaylist(token, input);
        break;
      case "spotify_remove_from_playlist":
        result = await removeFromPlaylist(token, input);
        break;
      case "spotify_update_playlist_details":
        result = await updatePlaylistDetails(token, input);
        break;
      case "spotify_get_playlist_items":
        result = await getPlaylistItems(token, input);
        break;
      case "spotify_reorder_playlist_items":
        result = await reorderPlaylistItems(token, input);
        break;
      case "spotify_replace_playlist_items":
        result = await replacePlaylistItems(token, input);
        break;
      case "spotify_get_playlist_cover_image":
        result = await getPlaylistCoverImage(token, input);
        break;
      case "spotify_set_playlist_cover_image":
        result = await setPlaylistCoverImage(token, input);
        break;
      // Browse
      case "spotify_get_track":
        result = await getTrack(token, input);
        break;
      case "spotify_get_album":
        result = await getAlbum(token, input);
        break;
      case "spotify_get_artist":
        result = await getArtist(token, input);
        break;
      case "spotify_get_artist_top_tracks":
        result = await getArtistTopTracks(token, input);
        break;
      case "spotify_get_artist_albums":
        result = await getArtistAlbums(token, input);
        break;
      case "spotify_get_related_artists":
        result = await getRelatedArtists(token, input);
        break;
      case "spotify_get_recommendations":
        result = await getRecommendations(token, input);
        break;
      // Library
      case "spotify_get_saved_tracks":
        result = await getSavedTracks(token, input);
        break;
      case "spotify_save_tracks":
        result = await saveTracks(token, input);
        break;
      case "spotify_remove_saved_tracks":
        result = await removeSavedTracks(token, input);
        break;
      case "spotify_get_top_items":
        result = await getTopItems(token, input);
        break;
      case "spotify_get_recently_played":
        result = await getRecentlyPlayed(token, input);
        break;
      default:
        return errorResult(`Unknown Spotify tool: ${toolName}`, "Unsupported Spotify tool");
    }
    return result;
  } catch (err: any) {
    return errorResult(err?.message || String(err), "Spotify request failed");
  }
}
