/**
 * Service-role Supabase access, exposed only as narrow ports (design D8a,
 * ADR-015). The service-role key (L3) is read from env here and never leaves
 * this file; callers get exactly the operations their workflow needs.
 *
 *   DeletionExternals — pii-deletion worker only.
 *   PhotoStorage      — storage procedures and the image-optimization worker.
 *                       Every path it receives is built server-side from the
 *                       caller's own athlete (services/storage.ts); request
 *                       handlers never pass a client-supplied path.
 *
 * Nothing else may create a service-role client.
 */
import { storageBucketSchema, type StorageBucket } from '@packages/validators';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getEnv } from '../env.js';

export interface StorageObjectRef {
  bucket: StorageBucket;
  path: string;
}

/** External (non-Postgres) side effects of an athlete deletion. */
export interface DeletionExternals {
  /** Every object under `prefix`, recursively, in every profile-photo bucket. */
  listStorageObjects(prefix: string): Promise<StorageObjectRef[]>;
  removeStorageObjects(objects: StorageObjectRef[]): Promise<void>;
  /** Idempotent: an already-deleted auth user counts as success. */
  deleteAuthUser(supabaseUserId: string): Promise<void>;
}

/** Storage operations for the profile-photo pipeline. Paths are bucket-relative. */
export interface PhotoStorage {
  createSignedUploadUrl(
    bucket: StorageBucket,
    path: string,
  ): Promise<{ signedUrl: string; token: string }>;
  createSignedViewUrl(bucket: StorageBucket, path: string, expiresIn: number): Promise<string>;
  exists(bucket: StorageBucket, path: string): Promise<boolean>;
  download(bucket: StorageBucket, path: string): Promise<Buffer>;
  upload(bucket: StorageBucket, path: string, body: Buffer, contentType: string): Promise<void>;
  /** Every object path under `prefix`, recursively. */
  list(bucket: StorageBucket, prefix: string): Promise<string[]>;
  remove(bucket: StorageBucket, paths: string[]): Promise<void>;
}

const ALL_BUCKETS = storageBucketSchema.options;
const LIST_PAGE_SIZE = 100;
const REMOVE_BATCH_SIZE = 100;

let adminClient: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient {
  if (adminClient !== null) return adminClient;
  const env = getEnv();
  if (env.SUPABASE_SERVICE_ROLE_KEY === undefined) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for storage and data deletion');
  }
  adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  return adminClient;
}

async function listRecursive(bucket: StorageBucket, prefix: string): Promise<string[]> {
  const storage = getAdminClient().storage.from(bucket);
  const paths: string[] = [];
  const folders = [prefix.replace(/\/+$/, '')];
  for (let folder = folders.pop(); folder !== undefined; folder = folders.pop()) {
    for (let offset = 0; ; offset += LIST_PAGE_SIZE) {
      const { data, error } = await storage.list(folder, { limit: LIST_PAGE_SIZE, offset });
      if (error !== null) throw new Error(`storage list failed: ${error.message}`);
      for (const item of data) {
        // Folders come back with a null id.
        if (item.id === null) folders.push(`${folder}/${item.name}`);
        else paths.push(`${folder}/${item.name}`);
      }
      if (data.length < LIST_PAGE_SIZE) break;
    }
  }
  return paths;
}

async function removeBatched(bucket: StorageBucket, paths: string[]): Promise<void> {
  const storage = getAdminClient().storage.from(bucket);
  for (let i = 0; i < paths.length; i += REMOVE_BATCH_SIZE) {
    const { error } = await storage.remove(paths.slice(i, i + REMOVE_BATCH_SIZE));
    if (error !== null) throw new Error(`storage remove failed: ${error.message}`);
  }
}

export function createSupabaseDeletionExternals(): DeletionExternals {
  return {
    async listStorageObjects(prefix) {
      const found: StorageObjectRef[] = [];
      for (const bucket of ALL_BUCKETS) {
        for (const path of await listRecursive(bucket, prefix)) found.push({ bucket, path });
      }
      return found;
    },

    async removeStorageObjects(objects) {
      for (const bucket of ALL_BUCKETS) {
        const paths = objects.filter((o) => o.bucket === bucket).map((o) => o.path);
        if (paths.length > 0) await removeBatched(bucket, paths);
      }
    },

    async deleteAuthUser(supabaseUserId) {
      const { error } = await getAdminClient().auth.admin.deleteUser(supabaseUserId);
      if (error !== null && error.status !== 404) {
        throw new Error(`auth user delete failed: ${error.message}`);
      }
    },
  };
}

export function createSupabasePhotoStorage(): PhotoStorage {
  const from = (bucket: StorageBucket) => getAdminClient().storage.from(bucket);
  return {
    async createSignedUploadUrl(bucket, path) {
      // Supabase fixes upload tokens at 2 hours; confirmUpload enforces the
      // 15-minute window (ADR-015).
      const { data, error } = await from(bucket).createSignedUploadUrl(path, { upsert: true });
      if (error !== null) throw new Error(`signed upload url failed: ${error.message}`);
      return { signedUrl: data.signedUrl, token: data.token };
    },

    async createSignedViewUrl(bucket, path, expiresIn) {
      const { data, error } = await from(bucket).createSignedUrl(path, expiresIn);
      if (error !== null) throw new Error(`signed view url failed: ${error.message}`);
      return data.signedUrl;
    },

    async exists(bucket, path) {
      // A missing object comes back as { data: false, error } (400/404);
      // anything else throws inside supabase-js.
      const { data } = await from(bucket).exists(path);
      return data;
    },

    async download(bucket, path) {
      const { data, error } = await from(bucket).download(path);
      if (error !== null) throw new Error(`storage download failed: ${error.message}`);
      return Buffer.from(await data.arrayBuffer());
    },

    async upload(bucket, path, body, contentType) {
      const { error } = await from(bucket).upload(path, body, {
        contentType,
        upsert: true,
        // Variant paths are versioned per upload, so they never change in place.
        cacheControl: '31536000',
      });
      if (error !== null) throw new Error(`storage upload failed: ${error.message}`);
    },

    list: listRecursive,
    remove: removeBatched,
  };
}
