import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/s3";

export const runtime = "nodejs";

/**
 * Media library (oceantune-style contract).
 *
 *   GET    /api/media  → 200 [{ key, url, name, createdAt }] newest first
 *   DELETE /api/media  body:{ key } → 200 { ok: true }
 *
 * The media index lives in Postgres because the storage server does not
 * list objects reliably; only files uploaded through /api/upload appear here.
 * Writes are restricted to keys under `media/` (the server-generated prefix).
 *
 * CORS is set because the SPA admin is a different origin than this app.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function cors(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(CORS)) res.headers.set(k, v);
  return res;
}

export async function OPTIONS(): Promise<NextResponse> {
  return cors(new NextResponse(null, { status: 204 }));
}

export async function GET(): Promise<NextResponse> {
  try {
    const files = await prisma.mediaFile.findMany({
      orderBy: { createdAt: "desc" },
      select: { key: true, url: true, name: true, createdAt: true },
    });
    return cors(NextResponse.json(files));
  } catch (err) {
    console.error("[media] list failed", err);
    return cors(NextResponse.json({ error: "Media library unavailable" }, { status: 500 }));
  }
}

export async function DELETE(req: Request): Promise<NextResponse> {
  let key: unknown;
  try {
    const body = (await req.json()) as { key?: unknown };
    key = body.key;
  } catch {
    return cors(NextResponse.json({ error: "Expected { key }" }, { status: 400 }));
  }

  if (typeof key !== "string" || !key.startsWith("media/")) {
    return cors(NextResponse.json({ error: "Invalid key" }, { status: 400 }));
  }

  try {
    await deleteFile(key);
  } catch (err) {
    // Missing object is not fatal — the row still gets cleared below.
    console.warn(`[media] delete object failed (${key})`, err);
  }

  try {
    await prisma.mediaFile.deleteMany({ where: { key } });
  } catch (err) {
    console.error("[media] db delete failed", err);
    return cors(NextResponse.json({ error: "Media library unavailable" }, { status: 500 }));
  }

  return cors(NextResponse.json({ ok: true }));
}