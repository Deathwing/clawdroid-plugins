// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

export interface IgProfile {
  id: string;
  username?: string;
  name?: string;
  biography?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  profile_picture_url?: string;
  website?: string;
}

export interface IgMediaItem {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  timestamp?: string;
  permalink?: string;
  like_count?: number;
  comments_count?: number;
}

export interface IgComment {
  id: string;
  text?: string;
  username?: string;
  timestamp?: string;
  like_count?: number;
}

export interface IgInsightMetric {
  name: string;
  values: { value: number | string }[];
}

export interface IgPagedResponse<T> {
  data: T[];
}
