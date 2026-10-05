/**
 * Service-role Supabase access for the pii-deletion worker ONLY (design D8a).
 *
 * The service-role key (L3) is read from env here and never passed around;
 * callers get a narrow port with exactly the three operations deletion needs.
 * Request handlers must never use this — they act as the user (AGENTS.md).
 */
import { storageBucketSchema } from '@packages/validators';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getEnv } from '../env.js';

/** External (non-Postgres) side effects of an athlete deletion. */
export interface DeletionExternals {
  /** Every object path under `prefix` in the profile-photos bucket, recursively. */
  listStorageObjects(prefix: string): Promise<string[]>;
  removeStorageObjects(paths: string[]): Promise<void>;
  /** Idempotent: an already-deleted auth user counts as success. */
  deleteAuthUser(supabaseUserId: string): Promise<void>;
}

const PROFILE_PHOTOS_BUCKET = storageBucketSchema.enum['profile-photos'];
const LIST_PAGE_SIZE = 100;
const REMOVE_BATCH_SIZE = 100;

let adminClient: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient {
  if (adminClient !== null) return adminClient;
  const env = getEnv();
  if (env.SUPABASE_SERVICE_ROLE_KEY === undefined) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for data deletion');
  }
  adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  return adminClient;
}

export function createSupabaseDeletionExternals(): DeletionExternals {
  return {
    async listStorageObjects(prefix) {
      const storage = getAdminClient().storage.from(PROFILE_PHOTOS_BUCKET);
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
    },

    async removeStorageObjects(paths) {
      const storage = getAdminClient().storage.from(PROFILE_PHOTOS_BUCKET);
      for (let i = 0; i < paths.length; i += REMOVE_BATCH_SIZE) {
        const { error } = await storage.remove(paths.slice(i, i + REMOVE_BATCH_SIZE));
        if (error !== null) throw new Error(`storage remove failed: ${error.message}`);
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
