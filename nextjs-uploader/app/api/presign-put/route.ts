import { NextResponse } from "next/server";
import { presignPut } from "@/lib/s3";

export const runtime = "nodejs";

/**
 * Prod signer leg — World 2 "tiny signer".
 *
 *   POST /api/presign-put   body: { key, contentType }
 *     → 200 { uploadUrl, publicUrl, key }   (or 400/401/500 { error })
 *
 * Mirrors the exact contract the SPA's dev middleware (`r2-signer-dev.ts`)
 * serves so a deployed uploader can replace the dev leg without touching the
 * client. The bucket is PUBLIC: the browser PUTs optimized bytes straight to
 * the presigned URL; only this server holds the R2_* secrets via @aws-sdk.
 */

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "";
// Accept R2_PUBLIC_URL with or without a scheme; the URL below adds https://.
const PUB_BASE = (process.env.R2_PUBLIC_URL ?? "")
  .replace(/^https?:\/\//i, "")
  .replace(/\/+$/, "");
const PUB_BUCKET = process.env.R2_BUCKET?.replace(/\/+$/, "") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-admin-secret",
  "Access-Control-Max-Age": "86400",
};

function cors(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(CORS)) res.headers.set(k, v);
  return res;
}

export async function OPTIONS(): Promise<NextResponse> {
  return cors(new NextResponse(null, { status: 204 }));
}

export async function POST(req: Request): Promise<NextResponse> {
  if (ADMIN_SECRET && (req.headers.get("x-admin-secret") ?? "") !== ADMIN_SECRET) {
    return cors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  if (!PUB_BASE || !PUB_BUCKET) {
    return cors(
      NextResponse.json(
        { error: "R2_PUBLIC_URL and R2_BUCKET are required to build the public URL" },
        { status: 500 }
      )
    );
  }

  let key = "";
  let contentType = "application/octet-stream";
  try {
    const body = await req.json();
    key = String(body?.key ?? "");
    contentType = String(body?.contentType ?? "application/octet-stream");
  } catch {
    return cors(NextResponse.json({ error: "Bad JSON" }, { status: 400 }));
  }

  const clean = key.replace(/^\/+/, "").replace(/\.\.\//g, "").slice(0, 200);
  if (!clean) {
    return cors(NextResponse.json({ error: "Missing key" }, { status: 400 }));
  }

  try {
    const uploadUrl = await presignPut(clean, contentType); // expiresIn defaults 3600
    const publicUrl = `https://${PUB_BASE}/s3/${PUB_BUCKET}/${clean}`;
    return cors(NextResponse.json({ uploadUrl, publicUrl, key: clean }));
  } catch (err) {
    console.error("[presign-put] mint failed", err);
    return cors(NextResponse.json({ error: "Mint failed" }, { status: 500 }));
  }
}
