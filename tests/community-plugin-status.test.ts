import assert from "node:assert/strict";
import test from "node:test";
import { getCommunityPluginStatus } from "../src/lib/community-plugins.ts";

test("marks an installed plugin as updateable when the community registry has a newer version", () => {
  const status = getCommunityPluginStatus(
    { id: "socials", name: "Socials", version: "1.12.3" },
    {
      version: 1,
      baseUrl: "https://example.test/dist",
      plugins: [
        {
          id: "socials",
          name: "Socials",
          version: "1.12.5",
          description: "Download social media",
          author: "TheArchiver",
          downloadFile: "plugin-social.zip",
          path: "plugins/plugin-social",
        },
      ],
    }
  );

  assert.deepEqual(status, {
    communityVersion: "1.12.5",
    communityDownloadUrl: "https://example.test/dist/plugin-social.zip",
    updateAvailable: true,
  });
});

test("does not mark an installed plugin as updateable when community version matches", () => {
  const status = getCommunityPluginStatus(
    { id: "socials", name: "Socials", version: "1.12.5" },
    {
      version: 1,
      baseUrl: "https://example.test/dist",
      plugins: [
        {
          id: "socials",
          name: "Socials",
          version: "1.12.5",
          description: "Download social media",
          author: "TheArchiver",
          downloadFile: "plugin-social.zip",
          path: "plugins/plugin-social",
        },
      ],
    }
  );

  assert.equal(status.updateAvailable, false);
  assert.equal(status.communityVersion, "1.12.5");
});

test("matches registry entries by slugified plugin name when ids differ", () => {
  const status = getCommunityPluginStatus(
    { id: "plugin-social", name: "Socials", version: "1.12.3" },
    {
      version: 1,
      baseUrl: "https://example.test/dist",
      plugins: [
        {
          id: "socials",
          name: "Socials",
          version: "1.12.5",
          description: "Download social media",
          author: "TheArchiver",
          downloadFile: "plugin-social.zip",
          path: "plugins/plugin-social",
        },
      ],
    }
  );

  assert.equal(status.updateAvailable, true);
  assert.equal(status.communityDownloadUrl, "https://example.test/dist/plugin-social.zip");
});
