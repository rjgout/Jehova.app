import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { apiError } from "@/lib/apiError";
import { audioDir, isAudioFileName } from "@/lib/audioMirror";

// Speelt de eigen kopie van een voorgelezen hoofdstuk af (zie audioMirror.ts).
// Alleen voor ingelogde gebruikers: de audio is van de kerk en deze server
// hoort geen openbare kopie ervan aan te bieden. Een <audio>-element stuurt
// de sessiecookie gewoon mee.
//
// Ondersteunt Range-verzoeken: de speler springt per vers naar een tijdstip
// en vraagt dan alleen dat stuk op, in plaats van het hele bestand.

async function serve(req: NextRequest, file: string, withBody: boolean) {
  const user = await getCurrentUser();
  if (!user) return await apiError("apiErrors.notLoggedIn", 401);
  const dir = audioDir();
  if (!dir || !isAudioFileName(file)) return await apiError("apiErrors.itemNotFound", 404);

  const filePath = path.join(/*turbopackIgnore: true*/ dir, file);
  let size: number;
  try {
    size = (await fs.promises.stat(/*turbopackIgnore: true*/ filePath)).size;
  } catch {
    return await apiError("apiErrors.itemNotFound", 404);
  }

  const headers: Record<string, string> = {
    "Content-Type": "audio/mpeg",
    "Accept-Ranges": "bytes",
    // De naam verandert als de opname verandert (zie audioMirror.ts), dus
    // de browser mag een bestand onbeperkt bewaren; private omdat het
    // achter een login staat.
    "Cache-Control": "private, max-age=31536000, immutable",
  };

  let start = 0;
  let end = size - 1;
  const range = req.headers.get("range");
  if (range) {
    // Alleen één bereik ("bytes=a-b", "bytes=a-" of "bytes=-n"); meer vraagt
    // een audiospeler niet.
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (match && (match[1] || match[2])) {
      if (match[1]) {
        start = Number(match[1]);
        if (match[2]) end = Math.min(Number(match[2]), size - 1);
      } else {
        start = Math.max(size - Number(match[2]), 0);
      }
    }
    if (!match || (!match[1] && !match[2]) || start > end || start >= size) {
      return new NextResponse(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` } });
    }
    headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
  }
  headers["Content-Length"] = String(end - start + 1);

  const body = withBody
    ? (Readable.toWeb(fs.createReadStream(/*turbopackIgnore: true*/ filePath, { start, end })) as ReadableStream<Uint8Array>)
    : null;
  return new NextResponse(body, { status: range ? 206 : 200, headers });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  return serve(req, (await params).file, true);
}

export async function HEAD(req: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  return serve(req, (await params).file, false);
}
