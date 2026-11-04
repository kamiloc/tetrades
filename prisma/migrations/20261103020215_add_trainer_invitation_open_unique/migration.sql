-- Follow-up to 20261101043359_add_admin_club_trainer_management, which was
-- applied before these hand-written statements were added (ADR-017, design D3).
-- Mirrored in supabase/constraints/club_trainer_invitation_open_unique.sql.

-- Every stored email is lowercased.
ALTER TABLE club_trainer_invitations
  ADD CONSTRAINT club_trainer_invitations_email_lowercase
  CHECK (email = lower(email));

-- At most one PENDING invitation per club and email, case-insensitively.
CREATE UNIQUE INDEX club_trainer_invitations_open_unique
  ON club_trainer_invitations (club_id, lower(email))
  WHERE status = 'PENDING';
