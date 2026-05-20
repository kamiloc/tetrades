import { z } from 'zod';

export const cuidSchema = z.string().cuid2();

export const uuidSchema = z.string().uuid();

export const datetimeSchema = z.coerce.date();

export const paginationInput = z.object({
  cursor: cuidSchema.optional(),
  take: z.number().int().min(1).max(50).default(20),
});
export type PaginationInput = z.infer<typeof paginationInput>;

export const slugSchema = z
  .string()
  .min(3)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens');

export const countryCodeSchema = z.string().length(2).toUpperCase();
