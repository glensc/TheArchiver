import { slugify } from "../plugins/helpers/string";

export const DEFAULT_COMMUNITY_PLUGINS_URL =
  "https://raw.githubusercontent.com/pauljoda/TheArchiver-CommunityPlugins/main/plugins.json";

export interface CommunityPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  downloadFile: string;
  path: string;
}

export interface CommunityManifest {
  version: number;
  baseUrl: string;
  plugins: CommunityPlugin[];
}

export interface InstalledPluginIdentity {
  id: string;
  name: string;
  version: string;
}

export interface CommunityPluginStatus {
  communityVersion: string | null;
  communityDownloadUrl: string | null;
  updateAvailable: boolean;
}

export function getCommunityPluginsUrl(): string {
  return process.env.COMMUNITY_PLUGINS_URL || DEFAULT_COMMUNITY_PLUGINS_URL;
}

export async function fetchCommunityManifest(): Promise<CommunityManifest> {
  const res = await fetch(getCommunityPluginsUrl(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch community plugins: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<CommunityManifest>;
}

export function findCommunityPlugin(
  installed: InstalledPluginIdentity,
  manifest: CommunityManifest
): CommunityPlugin | null {
  const installedNameSlug = slugify(installed.name);
  return (
    manifest.plugins.find(
      (plugin) =>
        plugin.id === installed.id ||
        slugify(plugin.name) === installedNameSlug
    ) ?? null
  );
}

export function getCommunityPluginStatus(
  installed: InstalledPluginIdentity,
  manifest: CommunityManifest | null
): CommunityPluginStatus {
  if (!manifest) {
    return {
      communityVersion: null,
      communityDownloadUrl: null,
      updateAvailable: false,
    };
  }

  const communityPlugin = findCommunityPlugin(installed, manifest);
  if (!communityPlugin) {
    return {
      communityVersion: null,
      communityDownloadUrl: null,
      updateAvailable: false,
    };
  }

  return {
    communityVersion: communityPlugin.version,
    communityDownloadUrl: `${manifest.baseUrl}/${communityPlugin.downloadFile}`,
    updateAvailable: installed.version !== communityPlugin.version,
  };
}
