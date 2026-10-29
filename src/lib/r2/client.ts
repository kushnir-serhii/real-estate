import "server-only";
import { DeleteObjectsCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Cloudflare R2. Three paths, in this order:
 * 1. the Worker binding `PHOTOS_BUCKET` (admin upload on Cloudflare; see docs/setup.md),
 * 2. the S3 API when every `R2_*` value is set (the sync in plain Node),
 * 3. fixture mode: objects are written under `public/r2-local/<key>`, which `photoUrl()` serves locally.
 * The `fs` import lives in the fixture path only; the binding lookup never throws outside Workers.
 */

const TIMEOUT_MS = 30_000;
const CACHE_CONTROL = "public, max-age=31536000, immutable";
const DELETE_BATCH = 1000;
const BINDING_DELETE_BATCH = 1000;
export const LOCAL_DIR = "public/r2-local";

type R2Config = { accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string };

const readConfig = (): R2Config | null => {
  const accountId = process.env.R2_ACCOUNT_ID?.trim() ?? "";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() ?? "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() ?? "";
  const bucket = process.env.R2_BUCKET?.trim() ?? "";
  if (accountId === "" || accessKeyId === "" || secretAccessKey === "" || bucket === "") return null;
  return { accountId, accessKeyId, secretAccessKey, bucket };
};

/** The slice of the R2 bucket binding used here (structural, so no generated binding type is needed). */
type R2BucketBinding = {
  put: (key: string, value: Uint8Array, options: { httpMetadata: { contentType: string; cacheControl: string } }) => Promise<unknown>;
  delete: (keys: string | string[]) => Promise<void>;
};

const isBucketBinding = (value: unknown): value is R2BucketBinding =>
  typeof value === "object" &&
  value !== null &&
  "put" in value &&
  typeof value.put === "function" &&
  "delete" in value &&
  typeof value.delete === "function";

/** The `PHOTOS_BUCKET` binding, or null outside a Workers / OpenNext context or when it isn't configured. */
const getBinding = async (): Promise<R2BucketBinding | null> => {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    // Not in the generated `CloudflareEnv` until the binding is added to wrangler.jsonc.
    if (!("PHOTOS_BUCKET" in env)) return null;
    const bucket: unknown = env.PHOTOS_BUCKET;
    return isBucketBinding(bucket) ? bucket : null;
  } catch {
    return null;
  }
};

export const isR2Fixture = (): boolean => readConfig() === null;

let cached: { config: R2Config; client: S3Client } | null = null;

const getClient = (config: R2Config): S3Client => {
  if (cached !== null && cached.config.accountId === config.accountId && cached.config.accessKeyId === config.accessKeyId) {
    return cached.client;
  }
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    // R2 doesn't accept the SDK's default CRC checksums on every call.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  cached = { config, client };
  return client;
};

/** Keys are `a/b/c.webp`-style: no empty, dot or backslash segments, so they can't leave the local dir. */
const assertSafeKey = (key: string): void => {
  const ok = key !== "" && key.split("/").every((part) => part !== "" && part !== "." && part !== ".." && !part.includes("\\"));
  if (!ok) throw new Error("r2: invalid object key");
};

const localPath = async (key: string): Promise<string> => {
  const path = await import("node:path");
  return path.join(process.cwd(), LOCAL_DIR, ...key.split("/"));
};

export const putObject = async (key: string, body: Uint8Array, contentType: string): Promise<void> => {
  assertSafeKey(key);
  const binding = await getBinding();
  if (binding !== null) {
    await binding.put(key, body, { httpMetadata: { contentType, cacheControl: CACHE_CONTROL } });
    return;
  }
  const config = readConfig();
  if (config === null) {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const file = await localPath(key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body);
    return;
  }
  await getClient(config).send(
    new PutObjectCommand({ Bucket: config.bucket, Key: key, Body: body, ContentType: contentType, CacheControl: CACHE_CONTROL }),
    { abortSignal: AbortSignal.timeout(TIMEOUT_MS) },
  );
};

export const deleteObjects = async (keys: readonly string[]): Promise<void> => {
  const unique = [...new Set(keys)];
  unique.forEach(assertSafeKey);
  if (unique.length === 0) return;
  const binding = await getBinding();
  if (binding !== null) {
    for (let i = 0; i < unique.length; i += BINDING_DELETE_BATCH) await binding.delete(unique.slice(i, i + BINDING_DELETE_BATCH));
    return;
  }
  const config = readConfig();
  if (config === null) {
    const fs = await import("node:fs/promises");
    for (const key of unique) await fs.rm(await localPath(key), { force: true });
    return;
  }
  for (let i = 0; i < unique.length; i += DELETE_BATCH) {
    const batch = unique.slice(i, i + DELETE_BATCH);
    const result = await getClient(config).send(
      new DeleteObjectsCommand({ Bucket: config.bucket, Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true } }),
      { abortSignal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    if ((result.Errors?.length ?? 0) > 0) throw new Error(`r2: ${result.Errors?.length ?? 0} object(s) were not deleted`);
  }
};
