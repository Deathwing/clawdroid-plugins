// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

/** YouTube Data API v3 response types */

export interface YtSnippet {
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  thumbnails?: { default?: { url: string } };
}

export interface YtSearchId {
  kind: string;
  videoId?: string;
  channelId?: string;
  playlistId?: string;
}

export interface YtSearchItem {
  id: YtSearchId;
  snippet: YtSnippet;
}

export interface YtSearchListResponse {
  items: YtSearchItem[];
  pageInfo?: { totalResults: number };
  nextPageToken?: string;
}

export interface YtVideoStatistics {
  viewCount: string;
  likeCount?: string;
  commentCount?: string;
}

export interface YtVideoContentDetails {
  duration: string; // ISO 8601, e.g. PT4M33S
}

export interface YtVideo {
  id: string;
  snippet: YtSnippet;
  statistics?: YtVideoStatistics;
  contentDetails?: YtVideoContentDetails;
}

export interface YtChannelStatistics {
  subscriberCount: string;
  videoCount: string;
  viewCount: string;
  hiddenSubscriberCount: boolean;
}

export interface YtChannel {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    customUrl?: string;
  };
  statistics?: YtChannelStatistics;
}

export interface YtPlaylist {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    channelTitle: string;
  };
  contentDetails?: { itemCount: number };
  status?: { privacyStatus: string };
}

export interface YtPlaylistItemResourceId {
  kind: string;
  videoId: string;
}

export interface YtPlaylistItemSnippet {
  title: string;
  description: string;
  channelTitle: string;
  position: number;
  publishedAt: string;
  resourceId: YtPlaylistItemResourceId;
  playlistId: string;
}

export interface YtPlaylistItem {
  id: string; // playlist item ID (used for removal)
  snippet: YtPlaylistItemSnippet;
}

export interface YtSubscription {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    resourceId: { kind: string; channelId: string };
    channelId: string;
  };
}

export interface YtListResponse<T> {
  items: T[];
  pageInfo?: { totalResults: number; resultsPerPage: number };
  nextPageToken?: string;
}
