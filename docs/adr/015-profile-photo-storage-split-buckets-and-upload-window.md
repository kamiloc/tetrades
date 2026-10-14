# ADR-015: Profile Photo Storage — Split Buckets and Upload Window

- **Status:** Accepted
- **Date:** 2026-10-14
- **Amends:** [ADR-010](010-background-jobs-storage-and-image-processing.md) (storage layout only; every ADR-010 rule still applies)

## Context

AGENTS.md described one bucket, `profile-photos/`, that was "public for optimized variants only" and also held the original upload. Supabase makes a whole bucket public or private, not single objects. A public bucket would expose originals, which may carry EXIF GPS and device data (L1-INTERNAL). The live bucket was private, so public profiles could not show a photo without short-lived signed URLs, which conflict with ISR pages cached for an hour.

Supabase also fixes signed *upload* tokens at 2 hours. AGENTS.md caps signed URLs at 15 minutes.

The project owner decided on 2026-10-14:
- split originals and variants into two buckets
- enforce the 15-minute window on the server

## Decision

### Buckets

| Bucket | Access | Contents | Classification |
| --- | --- | --- | --- |
| `profile-photo-originals` | private | `{athleteId}/{issuedAtMs}.{jpg\|png\|webp}`, max 10 MB, JPEG/PNG/WebP only | L1-INTERNAL |
| `profile-photos` | public | `{athleteId}/{issuedAtMs}/{thumb-150\|card-400\|full-1200}.webp`, WebP only | L0-PUBLIC |

- Settings live in `supabase/storage/buckets.sql`. No `storage.objects` policies exist, so clients have no direct object access. Uploads and private reads go only through server-issued signed URLs.
- `ProfilePhotoAsset.objectPath` is relative to its bucket. ORIGINAL rows live in the originals bucket; every other variant lives in `profile-photos`.
- Variant paths are versioned per upload, so a new photo gets a new URL and CDN or ISR caches never serve the previous one.
- After a successful run, the job deletes the athlete's *older* uploads from both buckets. It never deletes newer ones, which may still await confirmation. `deletePII` sweeps both buckets.

### Upload window

- `storage.getUploadUrl` builds the path from the caller's athlete and returns an `uploadId` of the form `{issuedAtMs}.{ext}`. The client never supplies a bucket or path.
- `storage.confirmUpload` rejects an `uploadId` older than 15 minutes (`BAD_REQUEST`). It also rejects any `uploadId` whose object does not exist under the caller's own folder (`NOT_FOUND`), so a forged or another athlete's id cannot be confirmed.
- A token used after the window leaves an orphan object that is never processed. The next successful upload, or `deletePII`, removes it.
- Signed *view* URLs (`storage.getViewUrl`) are owner-only and expire after 15 minutes.

### Processing

- `confirmUpload` persists the ORIGINAL row as `QUEUED`, with placeholder dimensions of 1×1, before it enqueues `image-optimization`. The worker writes the upright dimensions.
- The worker claims the row (`RUNNING`), renders the variants with sharp (`rotate()` and then `resize`/`webp`, with no metadata kept), and uploads them. In one transaction it then marks every row `READY` and points `avatarAssetId` at CARD_400.
- If the ORIGINAL row's path no longer matches the job, a newer upload has replaced it and the job is skipped. Any failure leaves the row `FAILED` and BullMQ retries; each attempt re-claims the row.

## Consequences

- Public pages can link variant URLs directly from the public bucket, with no signing.
- Service-role storage access is used by request handlers, but only through the narrow `PhotoStorage` port in `apps/api/src/lib/supabaseAdmin.ts`, and only with server-built paths.
- Applying the bucket settings is a Supabase configuration change made by the project owner. Making `profile-photos` public is safe only because no originals are stored there.
