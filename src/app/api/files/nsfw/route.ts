import { NextRequest, NextResponse } from "next/server";
import {
  getRelativePath,
  resolveSafePath,
  FileError,
} from "@/lib/files";
import { setExplicitNsfw } from "@/lib/file-metadata";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const paths: string[] = Array.isArray(body.paths)
      ? body.paths
      : body.path
        ? [body.path]
        : [];
    const isNsfw = body.isNsfw;

    if (paths.length === 0 || typeof isNsfw !== "boolean") {
      return NextResponse.json(
        { error: "paths and isNsfw are required" },
        { status: 400 }
      );
    }

    const safePaths: string[] = [];
    for (const relativePath of paths) {
      const { absolute, root } = resolveSafePath(relativePath);
      if (absolute === root) {
        return NextResponse.json(
          { error: "Cannot mark the root download directory" },
          { status: 403 }
        );
      }
      safePaths.push(getRelativePath(absolute, root));
    }

    setExplicitNsfw(safePaths, isNsfw);

    return NextResponse.json({
      success: true,
      updated: safePaths.length,
      isNsfw,
    });
  } catch (err) {
    if (err instanceof FileError) {
      const status =
        err.code === "TRAVERSAL"
          ? 403
          : err.code === "NOT_FOUND"
            ? 404
            : 400;
      return NextResponse.json({ error: err.message }, { status });
    }
    console.error("Error updating NSFW metadata:", err);
    return NextResponse.json(
      { error: "Failed to update NSFW metadata" },
      { status: 500 }
    );
  }
}
