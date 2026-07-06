import { z } from 'zod';

const envSchema = z.object({
  SUPABASE_URL: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGIN: z.string().min(1),
  API_PORT: z.coerce.number().int().positive().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).optional().default('development'),
  // L3-RESTRICTED: 64-char hex string (32 bytes) for AES-256-GCM envelope encryption.
  MASTER_ENCRYPTION_KEY: z
    .string()
    .length(64, 'MASTER_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)')
    .regex(/^[0-9a-fA-F]+$/, 'MASTER_ENCRYPTION_KEY must contain only hex characters'),
  // Rate limit tiers in requests per minute (Sprint 3 task 3.7 defaults).
  RATE_LIMIT_PUBLIC: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_AUTHED: z.coerce.number().int().positive().default(200),
  RATE_LIMIT_ADMIN: z.coerce.number().int().positive().default(2000),
  RATE_LIMIT_SENSITIVE: z.coerce.number().int().positive().default(5),
});

export type Env = z.infer<typeof envSchema>;

let runtimeEnv: NodeJS.ProcessEnv = process.env;
let cachedEnv: Env | null = null;

export function setEnvForTests(nextEnv: NodeJS.ProcessEnv): void {
  runtimeEnv = nextEnv;
  cachedEnv = null;
}

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;
  const parsed = envSchema.safeParse(runtimeEnv);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => issue.path.join('.') || 'unknown')
      .join(', ');
    throw new Error(`Invalid environment variables: ${issues}`);
  }
  cachedEnv = parsed.data;
  return cachedEnv;
}
