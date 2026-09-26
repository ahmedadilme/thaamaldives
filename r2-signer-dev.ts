/* ------------------------------------------------------------------------ */
/*  mvcdn R2 signer — Vite DEV-server middleware (World 2, tiny signer)      */
/* ------------------------------------------------------------------------ */
/**
 * Dev-only leg so uploads work in `npm run dev` with zero deploy, mirroring
 * the exact contract the production signer (in-repo `nextjs-uploader`) serves:
 *
 *   POST /api/presign-put  body:{ key, contentType }
 *     → 200 { uploadUrl, publicUrl }   (or 400/500 with { error })
 *
 * This file is imported ONLY by vite.config.ts (runs in the Node dev server),
 * never bundled into the client. R2_* credentials are read from process.env
 * here — they never reach the browser bundle.
 *
 * Prod deploys the same route via `nextjs-uploader` (see nextjs-uploader/…) —
 * the SPA just points VITE_R2_SIGNER_URL at whichever signer is live.
 */

import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Plugin } from "vite";

export interface DevSignerEnv {
  r2Endpoint: string; // e.g. https://cdn.example.com/s3
  r2Region: string;
  r2AccessKeyId: string;
  r2SecretAccessKey: string;
  r2Bucket: string;
  publicUrlBase: string; // e.g. cdn.example.com (no scheme)
}

function missing(label: string, v?: string): boolean {
  return !v || /^\s*$/.test(v);
}

/** Strip any scheme and trailing slashes so R2_PUBLIC_URL works either way. */
function host(v: string): string {
  return v.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

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
    publicUrlBase: get("R2_PUBLIC_URL"),
  };

  const configured =
    !missing("endpoint", env.r2Endpoint) &&
    !missing("accessKey", env.r2AccessKeyId) &&
    !missing("secret", env.r2SecretAccessKey) &&
    !missing("bucket", env.r2Bucket) &&
    !missing("publicUrl", env.publicUrlBase);

  return {
    name: "r2-dev-signer",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== "/api/presign-put" || req.method !== "POST") {
          return next();
        }
        if (!configured) {
          res.statusCode = 503;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error:
                "R2 not configured — fill R2_* env in the dev server (R2_PUBLIC_URL is required for the public URL)",
            })
          );
          return;
        }

        let body = "";
        for await (const chunk of req) body += chunk;
        let key = "";
        let contentType = "application/octet-stream";
        try {
          const json = JSON.parse(body || "{}");
          key = String(json.key || "");
          contentType = String(json.contentType || "application/octet-stream");
        } catch {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Bad JSON" }));
          return;
        }
        if (!key) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Missing key" }));
          return;
        }

        const s3 = new S3Client({
          region: env.r2Region,
          endpoint: env.r2Endpoint,
          forcePathStyle: true,
          credentials: {
            accessKeyId: env.r2AccessKeyId,
            secretAccessKey: env.r2SecretAccessKey,
          },
        });

        const uploadUrl = await getSignedUrl(
          s3,
          new PutObjectCommand({
            Bucket: env.r2Bucket,
            Key: key,
            ContentType: contentType,
          }),
          { expiresIn: 3600 }
        );

        const base = host(env.publicUrlBase);
        const bucket = env.r2Bucket;
        const clean = String(key).replace(/^\/+/, "");

        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            uploadUrl,
            publicUrl: `https://${base}/s3/${bucket}/${clean}`,
            key: clean,
          })
        );
      });
    },
  };
}
