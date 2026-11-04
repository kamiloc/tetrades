import { z } from 'zod';

// admin.whoAmI (ADR-017): reaching the procedure at all proves the caller is
// an admin (adminProcedure re-reads the role on every call), so the only
// possible answer is `true`. Non-admins get FORBIDDEN instead.
export const adminWhoAmIOutput = z.object({
  isAdmin: z.literal(true), /// L1-INTERNAL
});
export type AdminWhoAmIOutput = z.infer<typeof adminWhoAmIOutput>;
