import { getDb, schema } from "@/db";
import { eq } from "drizzle-orm";

export type NsfwMode = "off" | "blur" | "show";

export const NSFW_MODE_SETTING_KEY = "core.nsfw_mode";

export interface FileNsfwState {
  isNsfw: boolean;
  isNsfwExplicit: boolean;
}

interface NsfwMetadataRow {
  path: string;
  isNsfw: boolean;
}

export function normalizeRelativeFilePath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  return normalized
    .split("/")
    .filter(Boolean)
    .join("/");
}

export function normalizeNsfwMode(value: unknown): NsfwMode {
  return value === "blur" || value === "show" ? value : "off";
}

export function getNsfwMetadataRows(): NsfwMetadataRow[] {
  return getDb()
    .select({
      path: schema.fileMetadata.path,
      isNsfw: schema.fileMetadata.isNsfw,
    })
    .from(schema.fileMetadata)
    .where(eq(schema.fileMetadata.isNsfw, true))
    .all()
    .map((row) => ({
      path: normalizeRelativeFilePath(row.path),
      isNsfw: row.isNsfw,
    }));
}

export function getNsfwState(
  filePath: string,
  rows: NsfwMetadataRow[] = getNsfwMetadataRows()
): FileNsfwState {
  const normalized = normalizeRelativeFilePath(filePath);
  const isNsfwExplicit = rows.some((row) => row.path === normalized);
  const isNsfwInherited = rows.some(
    (row) => row.path !== normalized && isSameOrDescendant(normalized, row.path)
  );

  return {
    isNsfw: isNsfwExplicit || isNsfwInherited,
    isNsfwExplicit,
  };
}

export function setExplicitNsfw(paths: string[], isNsfw: boolean): void {
  const db = getDb();
  const now = new Date();
  const normalizedPaths = Array.from(
    new Set(paths.map(normalizeRelativeFilePath).filter(Boolean))
  );

  for (const filePath of normalizedPaths) {
    if (isNsfw) {
      db.insert(schema.fileMetadata)
        .values({
          path: filePath,
          isNsfw: true,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: schema.fileMetadata.path,
          set: { isNsfw: true, updatedAt: now },
        })
        .run();
    } else {
      db.delete(schema.fileMetadata)
        .where(eq(schema.fileMetadata.path, filePath))
        .run();
    }
  }
}

export function moveNsfwMetadata(sourcePath: string, targetPath: string): void {
  const source = normalizeRelativeFilePath(sourcePath);
  const target = normalizeRelativeFilePath(targetPath);
  if (!source || !target) return;

  const rows = matchingRows(source);
  deleteNsfwMetadata(target);

  for (const row of rows) {
    const nextPath = replacePathPrefix(row.path, source, target);
    getDb()
      .update(schema.fileMetadata)
      .set({ path: nextPath, updatedAt: new Date() })
      .where(eq(schema.fileMetadata.path, row.path))
      .run();
  }
}

export function copyNsfwMetadata(sourcePath: string, targetPath: string): void {
  const source = normalizeRelativeFilePath(sourcePath);
  const target = normalizeRelativeFilePath(targetPath);
  if (!source || !target) return;

  const rows = matchingRows(source);
  const now = new Date();

  for (const row of rows) {
    const nextPath = replacePathPrefix(row.path, source, target);
    getDb()
      .insert(schema.fileMetadata)
      .values({
        path: nextPath,
        isNsfw: row.isNsfw,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: schema.fileMetadata.path,
        set: { isNsfw: row.isNsfw, updatedAt: now },
      })
      .run();
  }
}

export function deleteNsfwMetadata(sourcePath: string): void {
  const source = normalizeRelativeFilePath(sourcePath);
  if (!source) return;

  for (const row of matchingRows(source)) {
    getDb()
      .delete(schema.fileMetadata)
      .where(eq(schema.fileMetadata.path, row.path))
      .run();
  }
}

function matchingRows(sourcePath: string): NsfwMetadataRow[] {
  return getNsfwMetadataRows().filter((row) =>
    isSameOrDescendant(row.path, sourcePath)
  );
}

function isSameOrDescendant(filePath: string, ancestorPath: string): boolean {
  return filePath === ancestorPath || filePath.startsWith(`${ancestorPath}/`);
}

function replacePathPrefix(
  filePath: string,
  sourcePath: string,
  targetPath: string
): string {
  const suffix = filePath.slice(sourcePath.length);
  return `${targetPath}${suffix}`;
}
