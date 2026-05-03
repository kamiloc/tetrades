# Retention and Deletion Workflow

## Goal

Meet Habeas Data deletion/export obligations while preventing accidental orphaned records or storage objects.

## Flow

1. A protected deletion/export endpoint validates consent and actor scope.
2. The API persists a deletion/export request.
3. A BullMQ job performs the heavy work.
4. Deletion cascades through all related tables and storage objects.
5. A post-deletion verification query confirms no residual records remain.
6. Audit logs capture request, execution, and verification outcomes.

## Required guardrails

- never delete data without an auditable request record
- deletion jobs must be idempotent
- storage objects and DB rows must be reconciled
- export jobs should generate a complete athlete ZIP bundle
- legal-hold must be enforced: deletion jobs must abort when `is_under_legal_hold = true`
