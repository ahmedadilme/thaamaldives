import { NextResponse } from "next/server";
import { uploadFile, publicUrl } from "@/lib/s3";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Upload leg (oceantune-style contract).
 *
 *   POST /api/upload   multipart/form-data: `file` field
 *     → 200 { key, url, name }   (or 400/500 with { error })
 *
 * The SPA POSTs the browser-optimized bytes here; this server PUTs them to
 * the bucket directly (server-to-server, so there is no browser→bucket CORS
 * preflight for mvcdn to reject), records the file in the media library, and
 * returns the permanent public URL.
 *
 * Key is generated server-side (`media/{ts}-{rand}.{ext}`), so the client
 * never controls the object's path. Uploads are capped by type: images 8 MB
 * (same as the reference implementation), videos 300 MB (web-ready H.264
 * export; matches the SPA's own guard).
 *
 * The OPTIONS handler + headers matter because the SPA is served from a
 * different origin than this app (VITE_R2_SIGNER_URL): a multipart POST
 * carries a non-safelisted content-type, so the browser preflights first.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function cors(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(CORS)) res.headers.set(k, v);
  return res;
}

function fail(message: string, status: number): NextResponse {
  return cors(NextResponse.json({ error: message }, { status }));
}

const MAX_MB = {
  image: 8,
  video: 300,
};

export async function OPTIONS(): Promise<NextResponse> {
  return cors(new NextResponse(null, { status: 204 }));
}

export async function POST(req: Request): Promise<NextResponse> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("Expected multipart/form-data", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File) || !file.size) {
    return fail("No file provided", 400);
  }

  const mime = file.type || "application/octet-stream";
  const capMB = mime.startsWith("video/") ? MAX_MB.video : MAX_MB.image;
  const body = Buffer.from(await file.arrayBuffer());
  if (body.byteLength > capMB * 1024 * 1024) {
    return fail(`File exceeds the ${capMB} MB limit`, 400);
  }

  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "bin";
  const key = `media/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  try {
    await uploadFile(key, body, mime);
  } catch (err) {
    console.error("[upload] failed", err);
    return fail("Upload failed", 500);
  }

  await prisma.mediaFile.upsert({
    where: { key },
    create: { key, url: publicUrl(key), name: file.name },
    update: {},
  });

  return cors(NextResponse.json({ key, url: publicUrl(key), name: file.name }));
}