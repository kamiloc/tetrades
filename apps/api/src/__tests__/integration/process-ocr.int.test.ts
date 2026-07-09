/**
 * OCR worker integration tests (Sprint 4, task 4.2).
 *
 * Real Prisma against the test database (never mocked — CLAUDE.md testing
 * rules); the two network edges (Supabase Storage download, Claude Vision)
 * are injected fakes, so the full DB pipeline — status transitions, OcrJob
 * rows, encryption at rest, athleteId copy, revert-on-failure — runs for
 * real. Live-broker retry plumbing (rethrow → BullMQ backoff) is covered by
 * queue-redis.int.test.ts; here the retry contract is asserted as "the
 * processor rejects and a second attempt creates a fresh OcrJob row while
 * the first row's rawOutputEnc stays untouched" (immutability).
 */
import './helpers/load-env.js';

import { randomUUID } from 'node:crypto';

import { decryptPII, encryptPII, initCryptoAudit } from '@packages/crypto';
import type { DecryptionAuditEvent } from '@packages/crypto';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

import { createOCRProcessor, OCR_MODEL_NAME, OCR_PROMPT_VERSION } from '../../jobs/processOCR.js';
import { QUEUE_NAMES } from '../../queue/registry.js';
import { makeRecordingLogger, type RecordedLog } from '../helpers/recording-logger.js';

import {
  cleanupFixtureAthlete,
  createFixtureAthlete,
  createTestSport,
  dbReady,
  deleteTestSport,
  prisma,
} from './helpers/setup.js';
import type { FixtureAthlete } from './helpers/setup.js';

// Distinctive plaintext markers: if any of these strings shows up in a log
// line or in stored ciphertext, medical data leaked.
const MEDICAL_FIELD = 'hemoglobin';
const MEDICAL_VALUE = 'LEAK-MARKER-17.3';
const VALID_MODEL_RESPONSE = JSON.stringify({
  fields: {
    [MEDICAL_FIELD]: { value: MEDICAL_VALUE, unit: 'g/dL', confidence: 0.93 },
    glucose: { value: 92, unit: 'mg/dL', confidence: 0.71 },
  },
});

function masterKey(): string {
  const key = process.env['MASTER_ENCRYPTION_KEY'];
  if (key === undefined || key === '') {
    throw new Error('MASTER_ENCRYPTION_KEY missing — load-env should have set a fallback');
  }
  return key;
}

async function createTestDocument(
  athleteId: string,
  status: 'UPLOADED' | 'PROCESSING' | 'VERIFIED' = 'UPLOADED',
): Promise<{ documentId: string; objectPath: string }> {
  const objectPath = `${athleteId}/${randomUUID()}.pdf`;
  const document = await prisma.medicalDocument.create({
    data: {
      athleteId,
      documentTypeEnc: Uint8Array.from(encryptPII('blood_panel', masterKey())),
      objectPathEnc: Uint8Array.from(encryptPII(objectPath, masterKey())),
      mimeType: 'application/pdf',
      sha256: 'a'.repeat(64),
      status,
    },
    select: { id: true },
  });
  return { documentId: document.id, objectPath };
}

interface ProcessorRun {
  lines: RecordedLog[];
  downloadedPaths: string[];
  run: (documentId: string, athleteId: string, requestId: string, attempt?: number) => Promise<void>;
}

/** Processor with fake network edges; extractText behavior is per-test. */
function buildProcessor(extractText: () => Promise<string>): ProcessorRun {
  const lines: RecordedLog[] = [];
  const downloadedPaths: string[] = [];
  const processor = createOCRProcessor({
    prisma,
    logger: makeRecordingLogger(lines),
    downloadDocument: (objectPath) => {
      downloadedPaths.push(objectPath);
      return Promise.resolve(Buffer.from('%PDF-1.4 fake document bytes'));
    },
    extractText,
  });
  return {
    lines,
    downloadedPaths,
    run: (documentId, athleteId, requestId, attempt = 0) =>
      processor({ id: `test-job-${requestId}`, attemptsMade: attempt, data: { documentId, athleteId, requestId } }),
  };
}

function assertNoMedicalContentInLogs(lines: RecordedLog[]): void {
  for (const line of lines) {
    const serialized = JSON.stringify(line);
    expect(serialized).not.toContain(MEDICAL_FIELD);
    expect(serialized).not.toContain(MEDICAL_VALUE);
    expect(serialized).not.toContain('g/dL');
  }
}

describe.skipIf(!dbReady)('processOCR worker (task 4.2)', () => {
  let sportId: string;
  let fixture: FixtureAthlete;
  const auditEvents: DecryptionAuditEvent[] = [];

  beforeAll(async () => {
    // decryptPII refuses to run without a registered audit emitter; a
    // recording emitter also lets the suite assert the audit contract.
    initCryptoAudit((event) => {
      auditEvents.push(event);
    });
    sportId = await createTestSport();
    fixture = await createFixtureAthlete(sportId);
  });

  afterAll(async () => {
    await prisma.ocrJob.deleteMany({ where: { athleteId: fixture.athleteId } });
    await prisma.medicalDocument.deleteMany({ where: { athleteId: fixture.athleteId } });
    await cleanupFixtureAthlete(fixture);
    await deleteTestSport(sportId);
  });

  beforeEach(() => {
    auditEvents.length = 0;
  });

  it('success path: UPLOADED → PENDING_REVIEW with encrypted outputs and copied athleteId', async () => {
    const { documentId, objectPath } = await createTestDocument(fixture.athleteId);
    const requestId = randomUUID();
    const { lines, downloadedPaths, run } = buildProcessor(() =>
      Promise.resolve(VALID_MODEL_RESPONSE),
    );

    await run(documentId, fixture.athleteId, requestId);

    // Document handed off to human review; verifiedDataEnc untouched.
    const document = await prisma.medicalDocument.findUnique({
      where: { id: documentId },
      select: { status: true, verifiedDataEnc: true },
    });
    expect(document?.status).toBe('PENDING_REVIEW');
    expect(document?.verifiedDataEnc).toBeNull();

    // The storage object was fetched via the DECRYPTED stored path.
    expect(downloadedPaths).toEqual([objectPath]);

    // Decrypting objectPathEnc emitted a mandatory audit event.
    expect(auditEvents).toHaveLength(1);
    expect(auditEvents[0]?.purpose).toBe('ocr_processing');
    expect(auditEvents[0]?.target.field).toBe('objectPathEnc');
    expect(auditEvents[0]?.requestId).toBe(requestId);

    // OcrJob row: athleteId copied from the document, prompt/model recorded.
    const ocrJob = await prisma.ocrJob.findFirst({
      where: { medicalDocumentId: documentId },
      select: {
        athleteId: true,
        modelName: true,
        promptVersion: true,
        status: true,
        rawOutputEnc: true,
        parsedDataEnc: true,
        confidenceMap: true,
        schemaValid: true,
        retryCount: true,
        requestId: true,
        startedAt: true,
        finishedAt: true,
      },
    });
    expect(ocrJob).not.toBeNull();
    if (ocrJob === null) return;
    expect(ocrJob.athleteId).toBe(fixture.athleteId);
    expect(ocrJob.modelName).toBe(OCR_MODEL_NAME);
    expect(ocrJob.promptVersion).toBe(OCR_PROMPT_VERSION);
    expect(ocrJob.status).toBe('SUCCEEDED');
    expect(ocrJob.schemaValid).toBe(true);
    expect(ocrJob.retryCount).toBe(0);
    expect(ocrJob.requestId).toBe(requestId);
    expect(ocrJob.startedAt).not.toBeNull();
    expect(ocrJob.finishedAt).not.toBeNull();

    // Encrypted fields persisted as ciphertext bytes, not plaintext.
    expect(ocrJob.rawOutputEnc).toBeInstanceOf(Uint8Array);
    expect(ocrJob.parsedDataEnc).toBeInstanceOf(Uint8Array);
    for (const stored of [ocrJob.rawOutputEnc, ocrJob.parsedDataEnc]) {
      const bytes = Buffer.from(stored ?? new Uint8Array());
      expect(bytes.length).toBeGreaterThan(0);
      expect(bytes.includes(MEDICAL_VALUE)).toBe(false);
      expect(bytes.includes(MEDICAL_FIELD)).toBe(false);
    }

    // Round-trip: decrypted content matches what the model produced.
    const rawPlain = decryptPII(Buffer.from(ocrJob.rawOutputEnc ?? new Uint8Array()), masterKey(), {
      actorId: 'test',
      purpose: 'test_roundtrip',
      targetTable: 'ocr_jobs',
      targetRecordId: documentId,
      targetField: 'rawOutputEnc',
      requestId,
    });
    expect(rawPlain).toBe(VALID_MODEL_RESPONSE);
    const parsedPlain = decryptPII(
      Buffer.from(ocrJob.parsedDataEnc ?? new Uint8Array()),
      masterKey(),
      {
        actorId: 'test',
        purpose: 'test_roundtrip',
        targetTable: 'ocr_jobs',
        targetRecordId: documentId,
        targetField: 'parsedDataEnc',
        requestId,
      },
    );
    expect(JSON.parse(parsedPlain)).toEqual(JSON.parse(VALID_MODEL_RESPONSE));

    // confidenceMap: numeric scores per field, no medical values.
    expect(ocrJob.confidenceMap).toEqual({ [MEDICAL_FIELD]: 0.93, glucose: 0.71 });

    // Logs carry the correlation id and zero medical content.
    const success = lines.find((line) => line.obj['event'] === 'ocr_document_processed');
    expect(success?.obj['requestId']).toBe(requestId);
    expect(success?.obj['documentId']).toBe(documentId);
    expect(success?.obj['queue']).toBe(QUEUE_NAMES.OCR_PROCESSING);
    assertNoMedicalContentInLogs(lines);
  });

  it('failure path: model error rejects (BullMQ retry) and reverts the document to UPLOADED', async () => {
    const { documentId } = await createTestDocument(fixture.athleteId);
    const requestId = randomUUID();
    const { lines, run } = buildProcessor(() =>
      Promise.reject(new Error('Anthropic API request failed with status 529')),
    );

    // Rethrow is the retry contract: BullMQ only retries a rejected job.
    await expect(run(documentId, fixture.athleteId, requestId)).rejects.toThrow(
      'Anthropic API request failed with status 529',
    );

    const document = await prisma.medicalDocument.findUnique({
      where: { id: documentId },
      select: { status: true },
    });
    expect(document?.status).toBe('UPLOADED');

    const ocrJob = await prisma.ocrJob.findFirst({
      where: { medicalDocumentId: documentId },
      select: { status: true, schemaValid: true, rawOutputEnc: true, finishedAt: true },
    });
    expect(ocrJob?.status).toBe('FAILED');
    expect(ocrJob?.schemaValid).toBe(false);
    expect(ocrJob?.rawOutputEnc).toBeNull(); // failed before the model responded
    expect(ocrJob?.finishedAt).not.toBeNull();

    const failed = lines.find((line) => line.obj['event'] === 'ocr_processing_failed');
    expect(failed?.level).toBe('error');
    expect(failed?.obj['requestId']).toBe(requestId);
    expect(failed?.obj['documentId']).toBe(documentId);
    assertNoMedicalContentInLogs(lines);
  });

  it('schema-invalid model output: raw output is still stored encrypted, then the job fails and reverts', async () => {
    const { documentId } = await createTestDocument(fixture.athleteId);
    const requestId = randomUUID();
    // Valid JSON, wrong shape (extra key + missing confidence).
    const badResponse = JSON.stringify({
      fields: { potassium: { value: 4.1, unit: 'mmol/L' } },
      note: 'unexpected',
    });
    const { run } = buildProcessor(() => Promise.resolve(badResponse));

    await expect(run(documentId, fixture.athleteId, requestId)).rejects.toThrow(
      'OCR model response failed schema validation',
    );

    const document = await prisma.medicalDocument.findUnique({
      where: { id: documentId },
      select: { status: true },
    });
    expect(document?.status).toBe('UPLOADED');

    // The raw response is the immutable dispute artifact — persisted
    // (encrypted) even though validation failed afterwards.
    const ocrJob = await prisma.ocrJob.findFirst({
      where: { medicalDocumentId: documentId },
      select: { status: true, schemaValid: true, rawOutputEnc: true, parsedDataEnc: true },
    });
    expect(ocrJob?.status).toBe('FAILED');
    expect(ocrJob?.schemaValid).toBe(false);
    expect(ocrJob?.parsedDataEnc).toBeNull();
    expect(ocrJob?.rawOutputEnc).toBeInstanceOf(Uint8Array);
    expect(Buffer.from(ocrJob?.rawOutputEnc ?? new Uint8Array()).includes('potassium')).toBe(false);
  });

  it('retry attempt creates a fresh OcrJob row; the failed row keeps its rawOutputEnc (immutability)', async () => {
    const { documentId } = await createTestDocument(fixture.athleteId);
    const requestId = randomUUID();

    // Attempt 0: schema-invalid response — raw output stored, job FAILED.
    const badRun = buildProcessor(() => Promise.resolve('{"fields": "not-an-object"}'));
    await expect(badRun.run(documentId, fixture.athleteId, requestId, 0)).rejects.toThrow(
      'OCR model response failed schema validation',
    );

    const firstRow = await prisma.ocrJob.findFirst({
      where: { medicalDocumentId: documentId },
      select: { id: true, rawOutputEnc: true, retryCount: true, status: true },
    });
    expect(firstRow?.status).toBe('FAILED');
    const firstRawBytes = Buffer.from(firstRow?.rawOutputEnc ?? new Uint8Array());

    // Attempt 1 (what BullMQ does after backoff): succeeds on a new row.
    const goodRun = buildProcessor(() => Promise.resolve(VALID_MODEL_RESPONSE));
    await goodRun.run(documentId, fixture.athleteId, requestId, 1);

    const rows = await prisma.ocrJob.findMany({
      where: { medicalDocumentId: documentId },
      orderBy: { retryCount: 'asc' },
      select: { id: true, status: true, retryCount: true, rawOutputEnc: true },
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]?.status).toBe('FAILED');
    expect(rows[0]?.retryCount).toBe(0);
    expect(rows[1]?.status).toBe('SUCCEEDED');
    expect(rows[1]?.retryCount).toBe(1);
    // The failed attempt's raw output was never rewritten.
    expect(Buffer.from(rows[0]?.rawOutputEnc ?? new Uint8Array()).equals(firstRawBytes)).toBe(
      true,
    );

    const document = await prisma.medicalDocument.findUnique({
      where: { id: documentId },
      select: { status: true },
    });
    expect(document?.status).toBe('PENDING_REVIEW');
  });

  it('documents already past OCR are never reprocessed or reverted', async () => {
    const { documentId } = await createTestDocument(fixture.athleteId, 'VERIFIED');
    const requestId = randomUUID();
    const { lines, downloadedPaths, run } = buildProcessor(() =>
      Promise.resolve(VALID_MODEL_RESPONSE),
    );

    await run(documentId, fixture.athleteId, requestId);

    const document = await prisma.medicalDocument.findUnique({
      where: { id: documentId },
      select: { status: true },
    });
    expect(document?.status).toBe('VERIFIED');
    expect(downloadedPaths).toHaveLength(0);
    const ocrJobCount = await prisma.ocrJob.count({ where: { medicalDocumentId: documentId } });
    expect(ocrJobCount).toBe(0);
    expect(lines.some((line) => line.obj['event'] === 'ocr_skipped')).toBe(true);
  });

  it('rejects a payload whose athleteId does not match the document owner', async () => {
    const { documentId } = await createTestDocument(fixture.athleteId);
    const { run } = buildProcessor(() => Promise.resolve(VALID_MODEL_RESPONSE));

    await expect(run(documentId, 'c'.repeat(25), randomUUID())).rejects.toThrow(
      'payload athleteId does not match medical document',
    );

    // Nothing changed: no OcrJob row, status untouched.
    const document = await prisma.medicalDocument.findUnique({
      where: { id: documentId },
      select: { status: true },
    });
    expect(document?.status).toBe('UPLOADED');
    expect(await prisma.ocrJob.count({ where: { medicalDocumentId: documentId } })).toBe(0);
  });
});
