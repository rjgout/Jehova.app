/**
 * Serve audio files locally with range request support for seeking.
 *
 * Paths:
 * - /api/audio/nl/1-nephi/001.mp3
 * - /api/audio/nl/1-nephi/002.mp3
 * etc.
 *
 * Supports HTTP Range requests for seeking/fast-forward in audio players.
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Whitelist to prevent directory traversal
const ALLOWED_PATHS = /^[a-z]{2}\/[a-z0-9-]+\/\d{3}\.mp3$/;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const audioPath = resolvedParams.path.join("/");

    // Validate path
    if (!ALLOWED_PATHS.test(audioPath)) {
      return NextResponse.json(
        { error: "Invalid audio path" },
        { status: 400 }
      );
    }

    // Resolve file path
    const audioDir =
      process.env.AUDIO_STORAGE_DIR || path.join(process.cwd(), "public/audio");
    const filePath = path.join(audioDir, audioPath);

    // Security: ensure file is within audio directory
    if (!filePath.startsWith(audioDir)) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "Audio file not found" },
        { status: 404 }
      );
    }

    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    const rangeHeader = request.headers.get("range");

    // No range request: send entire file
    if (!rangeHeader) {
      const buffer = fs.readFileSync(filePath);
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Length": String(fileSize),
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=86400", // 24 hours
        },
      });
    }

    // Parse range header
    const parts = rangeHeader.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    // Validate range
    if (isNaN(start) || isNaN(end) || start > end || start < 0 || end >= fileSize) {
      return new NextResponse(null, {
        status: 416,
        headers: {
          "Content-Range": `bytes */${fileSize}`,
        },
      });
    }

    const chunkSize = end - start + 1;
    const buffer = Buffer.allocUnsafe(chunkSize);
    const fd = fs.openSync(filePath, "r");
    fs.readSync(fd, buffer, 0, chunkSize, start);
    fs.closeSync(fd);

    return new NextResponse(buffer, {
      status: 206, // Partial Content
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(chunkSize),
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Audio endpoint error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
