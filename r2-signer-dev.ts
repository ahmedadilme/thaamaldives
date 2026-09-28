/* ------------------------------------------------------------------------ */
/*  mvcdn R2 signer — Vite DEV-server middleware (World 2, tiny signer)      */
/* ------------------------------------------------------------------------ */
/**
 * Dev-only leg so uploads work in `npm run dev` with zero deploy, mirroring
 * the exact contract the production uploader (in-repo `nextjs-uploader`) serves:
 *
 *   POST /api/upload       multipart/form-data: `file` field
 *     → 200 { key, url, name }   (or 400/500 with { error })
 *   GET  /api/media        → 200 [{ key, url, name, createdAt }] newest first
 *   DELETE /api/media      body:{ key } → 200 { ok: true }
 *   POST /api/presign-put  body:{ key, contentType }   (kept for parity)
 *     → 200 { uploadUrl, publicUrl }   (or 400/500 with { error })
 *
 * The upload leg is the live path: it PUTs the bytes to the bucket
 * server-side, so the browser never hits a cross-origin S3 CORS preflight
 * (mvcdn rejects OPTIONS for buckets without explicit CORS rules).
 *
 * The media library index is an in-memory store here (dev-only — it resets
 * on restart). Production persists uploads in Postgres via the
 * nextjs-uploader's Prisma MediaFile table; point VITE_R2_SIGNER_URL at the
 * deployed uploader to get the real, durable library.
 *
 * This file is imported ONLY by vite.config.ts (runs in the Node dev server),
 * never bundled into the client. R2_* credentials are read from process.env
 * here — they never reach the browser bundle.
 *
 * Prod deploys the same routes via `nextjs-uploader` (see nextjs-uploader/…) —
 * the SPA just points VITE_R2_SIGNER_URL at whichever server is live.
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

export interface DevSignerEnv {
  r2Endpoint: string; // e.g. https://cdn.example.com/s3
  r2Region: string;
  r2AccessKeyId: string;
  r2SecretAccessKey: string;
  r2Bucket: string;
}

function missing(label: string, v?: string): boolean {
  return !v || /^\s*$/.test(v);
}

interface MultipartPart {
  name?: string;
  filename?: string;
  type?: string;
  body?: Buffer;
}

/** Minimal single-pass multipart/form-data parser (one boundary, any parts). */
function parseMultipart(buf: Buffer, boundary: string): MultipartPart[] {
  const parts: MultipartPart[] = [];
  const delim = Buffer.from(`--${boundary}`);
  let idx = 0;
  for (;;) {
    const start = buf.indexOf(delim, idx);
    if (start === -1) break;
    let pos = start + delim.length;
    if (buf.subarray(pos, pos + 2).toString() === "--") break; // closing boundary
    if (buf.subarray(pos, pos + 2).toString() === "\r\n") pos += 2;
    const hEnd = buf.indexOf("\r\n\r\n", pos);
    if (hEnd === -1) break;
    const headers = buf.subarray(pos, hEnd).toString();
    const bodyStart = hEnd + 4;
    const bodyEnd = buf.indexOf(`\r\n--${boundary}`, bodyStart);
    if (bodyEnd === -1) break;
    const cd = /content-disposition:\s*form-data;\s*name="([^"]*)"(?:;\s*filename="([^"]*)")?/i.exec(headers);
    const ct = /content-type:\s*([^\r\n]+)/i.exec(headers)?.[1]?.trim();
    if (cd) {
      parts.push({
        name: cd[1],
        filename: cd[2]?.replace(/^.*[\\/]/, ""),
        type: ct,
        body: Buffer.from(buf.subarray(bodyStart, bodyEnd)),
      });
    }
    idx = bodyEnd + 2; // skip trailing CRLF of this part
  }
  return parts;
}

/** Dev-only in-memory media index (reset on restart; Postgres in prod). */
interface MediaRow {
  key: string;
  url: string;
  name: string;
  createdAt: number;
}
const mediaStore = new Map<string, MediaRow>();

/**
 * Vite plugin registering the dev signer middleware. Reads the R2_* secrets
 * from `source` (vite.config.ts passes Vite's loadEnv() result, because Node
 * does NOT auto-load .env into process.env), falling back to process.env.
 * When unconfigured the plugin still registers but answers 503, so
 * `npm run dev` works before you fill .env — uploads just error clearly.
 */
export function r2DevSigner(source: Record<string, string | undefined> = process.env): Plugin {
  const get = (k: string) => String(source[k] ?? "").trim();
  const env: DevSignerEnv = {
    r2Endpoint: get("R2_ENDPOINT"),
    r2Region: get("R2_REGION") || "us-east-1",
    r2AccessKeyId: get("R2_ACCESS_KEY_ID"),
    r2SecretAccessKey: get("R2_SECRET_ACCESS_KEY"),
    r2Bucket: get("R2_BUCKET"),
  };

  const configured =
    !missing("endpoint", env.r2Endpoint) &&
    !missing("accessKey", env.r2AccessKeyId) &&
    !missing("secret", env.r2SecretAccessKey) &&
    !missing("bucket", env.r2Bucket);

  const s3 = () =>
    new S3Client({
      region: env.r2Region,
      endpoint: env.r2Endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.r2AccessKeyId,
        secretAccessKey: env.r2SecretAccessKey,
      },
    });

  /** Public bucket URL for a key — same rule as the prod uploader. */
  const bucketUrl = (key: string): string =>
    `${env.r2Endpoint.replace(/\/+$/, "")}/${env.r2Bucket}/${String(key).replace(/^\/+/, "")}`;

  const json = (res: ServerResponse, status: number, data: unknown): void => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
  };

  const readBody = async (req: IncomingMessage): Promise<Buffer> => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return Buffer.concat(chunks);
  };

  return {
    name: "r2-dev-signer",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        const isMedia = url.pathname === "/api/media";
        const isUpload = url.pathname === "/api/upload";
        const isPresign = url.pathname === "/api/presign-put";
        if (!isMedia && !isUpload && !isPresign) return next();
        if (isUpload && req.method !== "POST") return next();
        if (isPresign && req.method !== "POST") return next();
        if (isMedia && req.method !== "GET" && req.method !== "DELETE") return next();
        if (!configured) {
          json(res, 503, {
            error: "R2 not configured — fill R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET in the dev server",
          });
          return;
        }

        // POST /api/upload — multipart file → server-side PUT, indexed.
        if (isUpload) {
          const contentType = String(req.headers["content-type"] || "");
          const bm = /boundary=([^;]+)/i.exec(contentType);
          if (!bm) {
            json(res, 400, { error: "Expected multipart/form-data" });
            return;
          }
          const boundary = bm[1].trim().replace(/^"|"$/g, "");
          const raw = await readBody(req);
          const file = parseMultipart(raw, boundary).find((p) => p.name === "file");
          if (!file || !file.body || !file.body.length) {
            json(res, 400, { error: "No file provided" });
            return;
          }

          const mime = file.type || "application/octet-stream";
          const capMB = mime.startsWith("video/") ? 300 : 8;
          if (file.body.byteLength > capMB * 1024 * 1024) {
            json(res, 400, { error: `File exceeds the ${capMB} MB limit` });
            return;
          }

          try {
            const ext = file.filename && file.filename.includes(".")
              ? file.filename.split(".").pop()!.toLowerCase()
              : "bin";
            const key = `media/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
            await s3().send(
              new PutObjectCommand({
                Bucket: env.r2Bucket,
                Key: key,
                Body: file.body,
                ContentType: mime,
              })
            );
            mediaStore.set(key, { key, url: bucketUrl(key), name: file.filename || key, createdAt: Date.now() });
            json(res, 200, { key, url: bucketUrl(key), name: file.filename || key });
          } catch (err) {
            console.error("[r2-dev-signer] upload failed", err);
            json(res, 500, { error: "Upload failed" });
          }
          return;
        }

        // GET /api/media — newest first.
        if (isMedia && req.method === "GET") {
          const rows = [...mediaStore.values()].sort((a, b) => b.createdAt - a.createdAt);
          json(res, 200, rows);
          return;
        }

        // DELETE /api/media — remove object + index row.
        if (isMedia && req.method === "DELETE") {
          let key: unknown = null;
          try {
            const body = JSON.parse(await readBody(req).then((b) => b.toString("utf8")) || "{}");
            key = body.key;
          } catch {
            json(res, 400, { error: "Expected { key }" });
            return;
          }
          if (typeof key !== "string" || !key.startsWith("media/")) {
            json(res, 400, { error: "Invalid key" });
            return;
          }
          try {
            await s3().send(new DeleteObjectCommand({ Bucket: env.r2Bucket, Key: key }));
          } catch (err) {
            console.warn(`[r2-dev-signer] delete object failed (${key})`, err);
          }
          mediaStore.delete(key);
          json(res, 200, { ok: true });
          return;
        }

        // POST /api/presign-put (kept for parity; media-tab uses /api/upload).
        let body = "";
        for await (const chunk of req) body += chunk;
        let key = "";
        let contentTypePresign = "application/octet-stream";
        try {
          const parsed = JSON.parse(body || "{}");
          key = String(parsed.key || "");
          contentTypePresign = String(parsed.contentType || "application/octet-stream");
        } catch {
          json(res, 400, { error: "Bad JSON" });
          return;
        }
        if (!key) {
          json(res, 400, { error: "Missing key" });
          return;
        }

        const uploadUrl = await getSignedUrl(
          s3(),
          new PutObjectCommand({
            Bucket: env.r2Bucket,
            Key: key,
            ContentType: contentTypePresign,
          }),
          { expiresIn: 3600 }
        );

        json(res, 200, {
          uploadUrl,
          publicUrl: bucketUrl(key),
          key: String(key).replace(/^\/+/, ""),
        });
      });
    },
  };
}