// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

/** Spotify API response types */

export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres?: string[];
  popularity?: number;
  followers?: { total: number };
  external_urls: { spotify: string };
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  album_type: string;
  artists: SpotifyArtist[];
  release_date: string;
  total_tracks: number;
  images: SpotifyImage[];
  external_urls: { spotify: string };
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
  track_number: number;
  popularity: number;
  explicit: boolean;
  uri: string;
  external_urls: { spotify: string };
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  owner: { id: string; display_name: string };
  public: boolean;
  tracks: { total: number };
  images: SpotifyImage[];
  external_urls: { spotify: string };
  uri: string;
}

export interface SpotifyDevice {
  id: string;
  is_active: boolean;
  name: string;
  type: string;
  volume_percent: number | null;
}

export interface SpotifyPlaybackState {
  device: SpotifyDevice;
  repeat_state: string;
  shuffle_state: boolean;
  is_playing: boolean;
  item: SpotifyTrack | null;
  progress_ms: number | null;
  currently_playing_type: string;
}

export interface SpotifyPaging<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  next: string | null;
}

export interface SpotifySearchResult {
  tracks?: SpotifyPaging<SpotifyTrack>;
  albums?: SpotifyPaging<SpotifyAlbum>;
  artists?: SpotifyPaging<SpotifyArtist>;
  playlists?: SpotifyPaging<SpotifyPlaylist>;
}

export interface SpotifyQueue {
  currently_playing: SpotifyTrack | null;
  queue: SpotifyTrack[];
}

export interface SpotifyPlayHistory {
  track: SpotifyTrack;
  played_at: string;
}
