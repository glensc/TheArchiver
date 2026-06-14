import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import {
  fetchCommunityManifest,
  getCommunityPluginStatus,
  type CommunityManifest,
} from "@/lib/community-plugins";

export async function GET() {
  try {
    const db = getDb();
    const plugins = db
      .select()
      .from(schema.installedPlugins)
      .orderBy(asc(schema.installedPlugins.sortOrder))
      .all();

    let communityManifest: CommunityManifest | null = null;
    try {
      communityManifest = await fetchCommunityManifest();
    } catch (err) {
      // Inline update status is best-effort; keep the installed plugin list usable
      // if GitHub/raw registry is unavailable.
      console.warn("Failed to fetch community plugin updates:", err);
    }

    const result = plugins.map((p) => ({
      id: p.id,
      name: p.name,
      version: p.version,
      description: p.description,
      author: p.author,
      urlPatterns: JSON.parse(p.urlPatterns) as string[],
      fileTypes: p.fileTypes ? JSON.parse(p.fileTypes) as string[] : [],
      enabled: p.enabled,
      hasSettings: p.hasSettings,
      installedAt: p.installedAt,
      sortOrder: p.sortOrder,
      ...getCommunityPluginStatus(p, communityManifest),
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json([]);
  }
}
