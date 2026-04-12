# PII Access Matrix

## Roles

- Public Visitor
- Athlete
- Reviewer
- Support Admin
- API Server
- Job Worker

## Access principles

- Public Visitor gets PUBLIC data only.
- Athlete may access their own private data subject to workflow state.
- Reviewer may access assigned review tasks and the minimal data required to verify documents.
- Support Admin has no default right to restricted data; any exceptional access requires break-glass handling.
- API Server and Job Worker use least privilege and only for the workflow they are executing.

## Matrix

### Public athlete profile

- Public Visitor: allow
- Athlete: allow
- Reviewer: allow if needed
- Support Admin: allow
- API Server: allow
- Job Worker: usually not needed

### Private athlete profile

- Public Visitor: deny
- Athlete: allow own
- Reviewer: deny by default
- Support Admin: limited / policy-dependent
- API Server: allow only through protected procedures
- Job Worker: deny unless a job explicitly requires it

### Medical documents

- Public Visitor: deny
- Athlete: allow own via signed URLs
- Reviewer: allow assigned review work
- Support Admin: deny by default / break-glass only
- API Server: allow via protected server routes
- Job Worker: allow only for OCR, deletion, or optimization jobs

### Verified medical data

- Public Visitor: deny
- Athlete: allow own through protected flows
- Reviewer: allow assigned review work
- Support Admin: deny by default / break-glass only
- API Server: allow through protected procedures
- Job Worker: deny unless a defined lifecycle job requires it

## Break-glass rule

If Support Admin access to RESTRICTED data is ever required:

1. purpose must be declared
2. access must be time-scoped
3. audit event is mandatory
4. the access path must be explicitly implemented and tested
