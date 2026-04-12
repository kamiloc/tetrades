# Document Upload Workflow

## Goal

Safely ingest private documents without passing files through the Fastify server.

## Flow

1. Client calls `storageRouter.getUploadUrl`.
2. Server authorizes the actor and returns a signed upload URL.
3. Client uploads directly to Supabase Storage.
4. Client confirms the upload using `storageRouter.confirmUpload`.
5. Server writes/updates the DB record.
6. Server enqueues the next background job (`processOCR` for medical PDFs, `optimizeImage` for profile photos).

## Rules

- medical PDFs go to `medical-documents/{athleteId}/{documentId}.pdf`
- profile photos go under `profile-photos/{athleteId}/...`
- medical document URLs are signed and short-lived
- Fastify never handles multipart uploads
- confirmation happens only after storage upload succeeds
