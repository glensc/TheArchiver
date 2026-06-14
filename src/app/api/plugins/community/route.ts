import { NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { slugify } from "@/plugins/helpers/string";
import {
  fetchCommunityManifest,
  type CommunityManifest,
  type CommunityPlugin,
} from "@/lib/community-plugins";

export async function GET() {
  try {
    const manifest: CommunityManifest = await fetchCommunityManifest();

    // Get installed plugins to determine status
    const db = getDb();
    const installed = db.select().from(schema.installedPlugins).all();
    const installedMap = new Map(installed.map((p) => [p.id, p]));

    // Also build a map by slugified name for matching plugins installed via
    // different methods (ZIP upload slugifies the manifest name, deploy scripts
    // use the directory name)
    const installedBySlug = new Map(
      installed.map((p) => [slugify(p.name), p])
    );

    const plugins = manifest.plugins.map((p) => {
      const existing =
        installedMap.get(p.id) ?? installedBySlug.get(slugify(p.name));
      return {
        ...p,
        installed: !!existing,
        installedVersion: existing?.version || null,
        updateAvailable: !!existing && existing.version !== p.version,
      };
    });

    return NextResponse.json({
      version: manifest.version,
      baseUrl: manifest.baseUrl,
      plugins,
    });
  } catch (err) {
    console.error("Error fetching community plugins:", err);
    return NextResponse.json(
      { error: "Failed to fetch community plugins" },
      { status: 500 }
    );
  }
}
