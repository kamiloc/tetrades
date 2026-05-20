import { z } from 'zod';

const envSchema = z.object({
  SUPABASE_URL: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGIN: z.string().min(1),
  API_PORT: z.coerce.number().int().positive().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).optional().default('development'),
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
