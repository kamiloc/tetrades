# sensitive-data-scope Specification

## Purpose

Defines which categories of data the platform treats as confidential and which it does not handle at all, so that medical records and OCR processing cannot reappear in the data model, API, or storage.

## Requirements

### Requirement: Platform does not store medical documents
The system SHALL NOT accept, store, process, or expose medical documents or medical data of any kind.

#### Scenario: No medical API surface
- **WHEN** a client lists the available API procedures
- **THEN** no procedure exists for uploading, reviewing, verifying, or reading medical documents

#### Scenario: No medical storage
- **WHEN** a client requests a signed upload URL for any bucket
- **THEN** only the profile photo bucket is accepted and a medical bucket value is rejected as invalid input

### Requirement: Confidential data is limited to identity PII
The system SHALL classify as L2-CONFIDENTIAL only identity PII: government ID, exact date of birth, contact email, and contact phone.

#### Scenario: Persisted L2 fields
- **WHEN** the database schema is inspected
- **THEN** every column holding L2-CONFIDENTIAL data belongs to the athlete private profile and is encrypted at rest

### Requirement: No OCR or document-extraction processing
The system SHALL NOT run OCR or third-party document-extraction jobs, and SHALL NOT require an external extraction API credential.

#### Scenario: Worker registry
- **WHEN** the API starts its background workers
- **THEN** no OCR worker or OCR queue is registered

#### Scenario: Environment validation
- **WHEN** the API validates its environment in production
- **THEN** startup does not require or read an OCR provider API key

### Requirement: Account data export and deletion cover only current data
The system SHALL export and delete athlete data across the current data model only, with no medical document or OCR job records or files remaining.

#### Scenario: Post-deletion verification
- **WHEN** an athlete deletion completes and verification runs
- **THEN** no table with a foreign key to the athlete holds rows for that athlete and no Storage file exists under the athlete's prefix
