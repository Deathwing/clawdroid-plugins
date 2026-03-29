// Copyright (c) 2026 Robert (Deathwing). All rights reserved.
// Licensed under proprietary license. See LICENSE file in the project root.

import { igGet, GRAPH_BASE } from "../api";
import type { IgProfile } from "../types";

export async function getProfile(token: string): Promise<string> {
  const resp = await igGet(
    token,
    `${GRAPH_BASE}/me?fields=id,name,username,biography,followers_count,follows_count,media_count,profile_picture_url,website`,
  );
  const p: IgProfile = resp.json();
  const lines: string[] = ["Instagram Profile:"];
  lines.push(`  Username: ${p.username || "?"}`);
  if (p.name) lines.push(`  Name: ${p.name}`);
  if (p.biography) lines.push(`  Bio: ${p.biography}`);
  lines.push(`  Followers: ${p.followers_count ?? "?"}`);
  lines.push(`  Following: ${p.follows_count ?? "?"}`);
  lines.push(`  Posts: ${p.media_count ?? "?"}`);
  lines.push(`  ID: ${p.id || "?"}`);
  return lines.join("\n");
}
