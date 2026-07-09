/**
 * ocr-processing worker (Sprint 4, task 4.2) — the real OCR pipeline.
 *
 * Flow (ADR-009 / ocr-review-workflow.md):
 *   UPLOADED → PROCESSING → Claude Vision → rawOutputEnc (immutable)
 *   → Zod validation → parsedDataEnc → PENDING_REVIEW
 *   Any failure reverts the document to UPLOADED (recoverable) and rethrows
 *   so BullMQ retries with the registry's exponential backoff.
 *
 * Invariants enforced here:
 *   - athleteId on OcrJob is copied from the fetched MedicalDocument row,
 *     never trusted from the queue payload (ADR-009).
 *   - One OcrJob row is created PER ATTEMPT, so rawOutputEnc is written
 *     exactly once per row and never overwritten (immutability).
 *   - verifiedDataEnc is NEVER written here — only verifyDocument may.
 *   - parsedDataEnc is machine output, not canonical truth; only the human
 *     review flow promotes data to verifiedDataEnc.
 *   - No plaintext medical data, ciphertext, or secrets reach a log line:
 *     only jobId, ocrJobId, documentId, requestId, queue, status, and
 *     sanitized error name/message are logged.
 *
 * External calls (Supabase Storage download, Anthropic Messages API) are
 * injectable so integration tests run against real Prisma with fakes for
 * the network edges.
 */
import { decryptPII, encryptPII } from '@packages/crypto';
import { ocrExtractionResult } from '@packages/validators';
import type { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import type { FastifyBaseLogger } from 'fastify';
import type { Redis } from 'ioredis';

import { getEnv } from '../env.js';
import { QUEUE_NAMES } from '../queue/registry.js';
import type { OcrProcessingJobData } from '../queue/registry.js';
import { createQueueWorker } from '../queue/worker.js';
import type { WorkerHandle } from '../queue/worker.js';

/** CLAUDE.md Medical OCR rule: this exact model, max_tokens 4096. */
export const OCR_MODEL_NAME = 'claude-sonnet-4-20250514';

/**
 * Deterministic prompt identifier persisted on every OcrJob row. Bump the
 * suffix whenever OCR_SYSTEM_PROMPT or OCR_USER_INSTRUCTION changes so
 * stored outputs stay attributable to the prompt that produced them.
 */
export const OCR_PROMPT_VERSION = 'medical-ocr-v1';

/** Private bucket for medical PDFs (document-upload-workflow.md). */
export const MEDICAL_DOCUMENTS_BUCKET = 'medical-documents';

/**
 * System prompt (version: OCR_PROMPT_VERSION). Requests strict JSON-only
 * output matching ocrExtractionResult: one field per extracted medical
 * value, a confidence score for every value, no prose, no markdown, no
 * extra keys.
 */
const OCR_SYSTEM_PROMPT = [
  'You are a medical-document data extraction system.',
  'Extract every medical test value, measurement, and finding from the provided document.',
  'Respond with a single JSON object and nothing else: no prose, no markdown, no code fences, no keys beyond the ones specified here.',
  'The JSON object has exactly one top-level key, "fields".',
  '"fields" maps one snake_case field name per extracted medical value to an object with exactly three keys:',
  '"value" (string, number, or boolean), "unit" (string, or null when the value has no unit),',
  'and "confidence" (a number between 0 and 1 expressing how certain you are of that extraction).',
  'Every extracted value must carry its own confidence score.',
  'If the document contains no extractable medical values, respond with {"fields":{}}.',
].join('\n');

const OCR_USER_INSTRUCTION =
  'Extract all medical values from this document as JSON per the system instructions.';

/** Image media types the Anthropic vision API accepts as base64 sources. */
const IMAGE_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

/**
 * The slice of a BullMQ Job the processor needs. Narrower than bullmq's Job
 * so tests can invoke the processor with a plain object; a real Job remains
 * assignable (contravariant parameter).
 */
export interface OcrJobLike {
  id?: string;
  attemptsMade: number;
  data: OcrProcessingJobData;
}

export interface ProcessOCRDeps {
  prisma: PrismaClient;
  logger: FastifyBaseLogger;
  /** Fetch the document bytes from the medical-documents bucket. */
  downloadDocument: (objectPath: string) => Promise<Buffer>;
  /** Call Claude Vision; returns the raw model response text. */
  extractText: (document: Buffer, mimeType: string) => Promise<string>;
}

/** name + message only — never a raw error object with unknown extra keys. */
function toLogSafeError(err: unknown): { name: string; message: string } {
  if (err instanceof Error) {
    return { name: err.name, message: err.message };
  }
  return { name: 'UnknownError', message: String(err) };
}

/**
 * Builds the job processor with injectable external edges. Exported for the
 * integration suite; production wiring is createProcessOCRWorker below.
 */
export function createOCRProcessor(deps: ProcessOCRDeps): (job: OcrJobLike) => Promise<void> {
  const { prisma, logger, downloadDocument, extractText } = deps;

  return async (job) => {
    const { documentId, requestId } = job.data;
    // Log context is ids only — never document content or paths.
    const logCtx = {
      queue: QUEUE_NAMES.OCR_PROCESSING,
      jobId: job.id,
      documentId,
      requestId,
    };

    const document = await prisma.medicalDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        athleteId: true,
        status: true,
        mimeType: true,
        objectPathEnc: true,
        athlete: {
          select: { userAccount: { select: { supabaseUserId: true } } },
        },
      },
    });

    if (!document) {
      throw new Error('medical document not found');
    }
    // The payload's athleteId is a hint; the DB row is the authority
    // (ADR-009: athleteId is COPIED from MedicalDocument). A mismatch means
    // a stale or forged payload — fail loudly, touch nothing.
    if (document.athleteId !== job.data.athleteId) {
      throw new Error('payload athleteId does not match medical document');
    }
    // UPLOADED is the normal entry; PROCESSING re-entry covers a retry after
    // a crash that skipped the revert. Anything further along the state
    // machine must not be reprocessed OR reverted.
    if (document.status !== 'UPLOADED' && document.status !== 'PROCESSING') {
      logger.info(
        { ...logCtx, event: 'ocr_skipped', status: document.status },
        'document already past OCR — skipping',
      );
      return;
    }

    const masterKey = getEnv().MASTER_ENCRYPTION_KEY;

    // One OcrJob row per attempt: rawOutputEnc on each row is written once
    // and never updated, preserving its immutability across retries.
    const ocrJob = await prisma.ocrJob.create({
      data: {
        medicalDocumentId: document.id,
        athleteId: document.athleteId, // copied from MedicalDocument (ADR-009)
        modelName: OCR_MODEL_NAME,
        promptVersion: OCR_PROMPT_VERSION,
        status: 'RUNNING',
        retryCount: job.attemptsMade,
        requestId,
        startedAt: new Date(),
      },
      select: { id: true },
    });

    // State machine step 1: PROCESSING before any call to Anthropic.
    await prisma.medicalDocument.update({
      where: { id: document.id },
      data: { status: 'PROCESSING' },
      select: { id: true },
    });

    try {
      // objectPathEnc is L2 — decryption is audited. The actor is the owning
      // athlete: the system processes their own upload on their behalf, and
      // the audit row stays visible to them under audit_log RLS.
      const objectPath = decryptPII(Buffer.from(document.objectPathEnc), masterKey, {
        actorId: document.athlete.userAccount.supabaseUserId,
        purpose: 'ocr_processing',
        targetTable: 'medical_documents',
        targetRecordId: document.id,
        targetField: 'objectPathEnc',
        requestId,
      });

      const fileBuffer = await downloadDocument(objectPath);
      const rawText = await extractText(fileBuffer, document.mimeType);

      // Step 2: persist the raw response (encrypted, write-once) BEFORE
      // validation, so a schema failure still leaves the audit artifact.
      await prisma.ocrJob.update({
        where: { id: ocrJob.id },
        data: { rawOutputEnc: Uint8Array.from(encryptPII(rawText, masterKey)) },
        select: { id: true },
      });

      // Step 3: validate. Errors are rethrown with sanitized messages so no
      // extracted medical value can leak through worker failure logs.
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(rawText);
      } catch {
        throw new Error('OCR model response is not valid JSON');
      }
      const validation = ocrExtractionResult.safeParse(parsedJson);
      if (!validation.success) {
        throw new Error('OCR model response failed schema validation');
      }

      // confidenceMap is L1 — numeric scores keyed by field name, no values.
      const confidenceMap = Object.fromEntries(
        Object.entries(validation.data.fields).map(([field, entry]) => [field, entry.confidence]),
      );

      // Step 4: persist validated data (encrypted) and close the OcrJob.
      await prisma.ocrJob.update({
        where: { id: ocrJob.id },
        data: {
          parsedDataEnc: Uint8Array.from(encryptPII(JSON.stringify(validation.data), masterKey)),
          confidenceMap,
          schemaValid: true,
          status: 'SUCCEEDED',
          finishedAt: new Date(),
        },
        select: { id: true },
      });

      // Step 5: hand off to human review. verifiedDataEnc is untouched.
      await prisma.medicalDocument.update({
        where: { id: document.id },
        data: { status: 'PENDING_REVIEW' },
        select: { id: true },
      });

      logger.info(
        { ...logCtx, event: 'ocr_document_processed', ocrJobId: ocrJob.id },
        'OCR complete — document pending review',
      );
    } catch (err) {
      // Step 6: ANY failure reverts to UPLOADED (never REJECTED — that is a
      // human-only status). Step 7: error-level log with jobId, documentId,
      // requestId, and a sanitized reason.
      logger.error(
        { ...logCtx, event: 'ocr_processing_failed', ocrJobId: ocrJob.id, error: toLogSafeError(err) },
        'OCR failed — reverting document to UPLOADED',
      );
      try {
        await prisma.ocrJob.update({
          where: { id: ocrJob.id },
          data: { status: 'FAILED', finishedAt: new Date() },
          select: { id: true },
        });
        await prisma.medicalDocument.update({
          where: { id: document.id },
          data: { status: 'UPLOADED' },
          select: { id: true },
        });
      } catch (revertErr) {
        // A failed revert leaves the doc in PROCESSING; the retry re-enters
        // via the PROCESSING guard above, so this is recoverable — but it
        // must be visible, and it must not mask the original failure.
        logger.error(
          { ...logCtx, event: 'ocr_revert_failed', error: toLogSafeError(revertErr) },
          'failed to revert document after OCR failure',
        );
      }
      // Rethrow so BullMQ marks the attempt failed and applies the queue's
      // retry/backoff policy (registry DEFAULT_JOB_OPTIONS).
      throw err;
    }
  };
}

/**
 * Production storage edge: download from the private medical-documents
 * bucket using the service-role key (server-side credentials only; signed
 * URLs are for clients, not workers).
 */
function downloadFromStorage(objectPath: string): Promise<Buffer> {
  const env = getEnv();
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey === undefined) {
    return Promise.reject(new Error('SUPABASE_SERVICE_ROLE_KEY is not configured'));
  }
  const supabase = createClient(env.SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return supabase.storage
    .from(MEDICAL_DOCUMENTS_BUCKET)
    .download(objectPath)
    .then(({ data, error }) => {
      if (error !== null || data === null) {
        // Storage errors are generic ("Object not found") — safe to log, but
        // never append the object path (it is L2 plaintext here).
        throw new Error(`storage download failed: ${error?.message ?? 'empty response'}`);
      }
      return data.arrayBuffer().then((bytes) => Buffer.from(bytes));
    });
}

/** Narrow the Anthropic Messages response to its first text block. */
function firstTextBlock(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || !('content' in body)) return null;
  const content: unknown = body.content;
  if (!Array.isArray(content)) return null;
  const blocks: unknown[] = content;
  for (const block of blocks) {
    if (typeof block !== 'object' || block === null) continue;
    if (!('type' in block) || block.type !== 'text') continue;
    if (!('text' in block) || typeof block.text !== 'string') continue;
    return block.text;
  }
  return null;
}

/**
 * Production model edge: Claude Vision over native fetch (no SDK dependency;
 * CLAUDE.md dependency rules). Error messages carry the HTTP status only —
 * never the response body, which could echo document content.
 */
async function callClaudeVision(document: Buffer, mimeType: string): Promise<string> {
  const apiKey = getEnv().ANTHROPIC_API_KEY;
  if (apiKey === undefined) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const base64Data = document.toString('base64');
  let sourceBlock: Record<string, unknown>;
  if (mimeType === 'application/pdf') {
    sourceBlock = {
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: base64Data },
    };
  } else if (IMAGE_MEDIA_TYPES.has(mimeType)) {
    sourceBlock = {
      type: 'image',
      source: { type: 'base64', media_type: mimeType, data: base64Data },
    };
  } else {
    // mimeType is L1 (file format, not content) — safe in the error message.
    throw new Error(`unsupported mime type for OCR: ${mimeType}`);
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: OCR_MODEL_NAME,
      max_tokens: 4096,
      system: OCR_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [sourceBlock, { type: 'text', text: OCR_USER_INSTRUCTION }],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API request failed with status ${response.status}`);
  }

  const body: unknown = await response.json();
  const text = firstTextBlock(body);
  if (text === null) {
    throw new Error('Anthropic API response contained no text content');
  }
  return text;
}

export function createProcessOCRWorker(
  connection: Redis,
  logger: FastifyBaseLogger,
  prisma: PrismaClient,
): WorkerHandle {
  return createQueueWorker({
    queueName: QUEUE_NAMES.OCR_PROCESSING,
    connection,
    concurrency: getEnv().WORKER_CONCURRENCY_OCR,
    logger,
    processor: createOCRProcessor({
      prisma,
      logger,
      downloadDocument: downloadFromStorage,
      extractText: callClaudeVision,
    }),
  });
}
