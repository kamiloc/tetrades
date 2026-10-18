-- CreateEnum
CREATE TYPE "metric_direction" AS ENUM ('HIGHER_IS_BETTER', 'LOWER_IS_BETTER', 'NEUTRAL');

-- AlterTable: add nullable, backfill the seeded catalog, then require it.
ALTER TABLE "metric_definitions" ADD COLUMN "direction" "metric_direction";

UPDATE "metric_definitions" SET "direction" = 'HIGHER_IS_BETTER' WHERE "key" IN (
  'vertical_jump', 'vo2max', 'yo_yo_ir1_distance', 'course_navette_level',
  'match_distance_covered', 'high_speed_running_distance',
  'ftp_w_per_kg', 'ftp_watts', 'power_5min_w_per_kg', 'bmx_peak_power',
  'triple_jump',
  'snatch_max', 'clean_and_jerk_max', 'weightlifting_total',
  'punch_rate', 'rear_cross_peak_force', 'lead_jab_peak_force',
  'pitch_velocity_max', 'fastball_spin_rate', 'exit_velocity_max',
  'free_throw_pct', 'basketball_points_per_game',
  'spike_reach', 'block_reach', 'volleyball_serve_speed',
  'futsal_goals_per_match',
  'tejo_points_per_match', 'tejo_mecha_rate', 'tejo_embocinadas_per_match',
  'tennis_first_serve_speed', 'tennis_first_serve_pct'
);

UPDATE "metric_definitions" SET "direction" = 'LOWER_IS_BETTER' WHERE "key" IN (
  'resting_heart_rate',
  'sprint_10m', 'sprint_30m', 'rsa_mean_time', 'futsal_sprint_20m', 'lane_agility',
  'bmx_lap_time', 'bmx_gate_start_5m',
  'skating_200m_time_trial', 'skating_500m_sprint', 'skating_1000m',
  'sprint_100m', 'run_400m', 'run_400m_hurdles',
  'sixty_yard_dash', 'catcher_pop_time',
  'swim_50m_freestyle', 'swim_100m_freestyle'
);

UPDATE "metric_definitions" SET "direction" = 'NEUTRAL' WHERE "key" IN (
  'body_mass', 'body_fat_pct'
);

-- Fails loudly if any definition (e.g. a leftover test row) was not mapped above.
ALTER TABLE "metric_definitions" ALTER COLUMN "direction" SET NOT NULL;

-- AlterTable
ALTER TABLE "athlete_metric_summaries"
  ADD COLUMN "best_value" DECIMAL(12,4),
  ADD COLUMN "best_measured_at" TIMESTAMP(3);

-- Backfill personal bests from existing entries. Ties go to the first
-- recorded entry, matching reportEntry. NEUTRAL metrics stay NULL.
UPDATE "athlete_metric_summaries" s
SET "best_value" = b."value", "best_measured_at" = b."measured_at"
FROM (
  SELECT DISTINCT ON (e."athlete_id", e."metric_definition_id")
    e."athlete_id", e."metric_definition_id", e."value", e."measured_at"
  FROM "athlete_metric_entries" e
  JOIN "metric_definitions" d ON d."id" = e."metric_definition_id"
  WHERE d."direction" <> 'NEUTRAL'
  ORDER BY
    e."athlete_id",
    e."metric_definition_id",
    CASE WHEN d."direction" = 'HIGHER_IS_BETTER' THEN e."value" END DESC NULLS LAST,
    CASE WHEN d."direction" = 'LOWER_IS_BETTER' THEN e."value" END ASC NULLS LAST,
    e."created_at" ASC,
    e."id" ASC
) b
WHERE s."athlete_id" = b."athlete_id"
  AND s."metric_definition_id" = b."metric_definition_id";
