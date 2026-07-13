# RealPDF Product Roadmap

Date: 2026-07-13  
Source audit: `REALPDF_PRODUCT_AUDIT.md`

## Prioritization principles

1. Preserve verified local editing behavior and the current RealPDF visual system.
2. Correct data loss, access, export, and misleading controls before adding breadth.
3. Introduce backend capabilities before exposing collaboration, signatures, enterprise, or AI promises.
4. Ship behind measurable acceptance criteria with tests and migration/rollback plans.
5. Use versioned document and operation schemas from the first server-backed milestone.

Complexity scale: **S** (days), **M** (1–2 weeks), **L** (3–6 weeks), **XL** (multi-team/quarter), assuming one experienced product engineering team and excluding procurement/compliance lead time.

## Milestone 1 — Reliable editor foundation

Priority: P0  
Estimated complexity: **L**  
Scope for this implementation branch: **only this milestone**

### Dependencies

- Existing React/PDF.js/pdf-lib implementation.
- A repository-owned persistence/access contract.
- Test runner and deterministic PDF fixtures.
- Firebase configuration remains optional for local development; cloud security rules require a separate deploy decision.

### Deliverables

- Typed/structured PDF input validation with distinct invalid, encrypted, corrupted, empty, and oversized errors.
- Active-document restoration after refresh with ownership checks before opening by ID.
- Guest/session partitioning for browser-local documents and strict signed-in owner checks.
- Honest editor controls: each visible action works in the supported scope or is disabled with an unavailable label.
- Central save coordinator with debouncing and explicit `Unsaved`, `Saving`, `Saved`, and `Error` states.
- Revision field and compare-before-write behavior for local persistence; cloud writes report failure instead of silently succeeding.
- One undo transaction per supported editor operation, including adds, deletes, moves/resizes, text edits, property changes, and page operations.
- One export builder used by both editor and dashboard, preserving supported edits.
- Explicit editor loading, unavailable/empty, failure, and offline states.
- Unit/integration tests for validation, access, persistence/revision handling, history, and export; a scripted core-flow smoke check.

### Acceptance criteria

- Uploading a valid PDF opens it in the editor.
- Invalid, encrypted, corrupted, empty, and oversized files show helpful, distinct errors.
- Every editor toolbar button either works or is visibly disabled and labeled unavailable.
- Supported editing operations persist after refresh.
- Undo and redo work across the supported operation list.
- Autosave visibly transitions through Saving, Saved, and Error states and never reports Saved after a failed write.
- Downloaded PDFs parse successfully and preserve supported edits.
- Documents appear correctly in the dashboard and dashboard download uses the edited document state.
- A signed-in user cannot open another owner’s document by changing an ID; guests cannot read documents from another guest partition.
- The editor provides loading, unavailable/empty, error, and offline states.
- Core flows have automated tests and the production build passes.
- Existing baby-blue/white dashboard and compact editor design remain consistent.

### Release gate

- All Milestone 1 tests and build pass in CI.
- Firebase security rules are reviewed, checked in, and tested before cloud persistence is called production-secure.
- Manual validation uses valid, encrypted, corrupted, oversized, and edited-export fixtures in a clean browser profile.

## Milestone 2 — Versioned document service and storage

Priority: P0  
Estimated complexity: **XL**

### Dependencies

- Milestone 1 document/access contracts.
- Backend platform decision (Firebase Functions/Cloud Run or equivalent), environment strategy, and secrets management.
- Migration plan for existing Storage JSON/local documents.

### Deliverables

- Server API for document metadata and operations with authentication and authorization on every request.
- Object storage for original PDFs, derived previews, and versioned edit-operation payloads.
- Signed upload/download URLs, checksums, size/type validation, malware scanning hook, and upload finalization.
- Revision preconditions/idempotency keys, conflict responses, immutable versions, restore, and soft delete.
- Folder/project entities; recent, starred, trash, restore, search, sort, and filter APIs.
- Structured errors, request IDs, audit logging, metrics, traces, alerting, and backups.

### Acceptance criteria

- Cross-tenant reads/writes fail in emulator and integration tests.
- Concurrent edits never silently overwrite a newer revision.
- Original and edited versions can be restored and downloaded.
- Deleted documents are recoverable during retention and purged by policy.
- Upload/download traffic does not proxy large binaries through the web client bundle.

## Milestone 3 — Complete editor and page operations

Priority: P1  
Estimated complexity: **XL**

### Dependencies

- Milestones 1–2.
- Versioned operation schema and background processing.

### Deliverables

- True object/text editing where technically supported, with explicit fallback for flattened/scanned content.
- Links, shapes, highlight/underline/strike-through, threaded comments, fullscreen, searchable shortcut map.
- Duplicate, extract, split, merge, rotate, and reorder with fidelity-preserving export.
- Page virtualization, memory limits, worker isolation, progressive rendering, and crash recovery.
- Form-field authoring/detection, headers/footers, watermarks, page numbers, flattening, and permanent redaction.
- Accessibility pass for keyboard, focus, semantics, contrast, zoom/reflow, and screen readers.

### Acceptance criteria

- A golden PDF suite passes pixel/text/structure comparisons across render, edit, save, refresh, and export.
- Permanent redaction removes target content from rendered output and extractable text.
- Large supported documents remain responsive within defined memory/performance budgets.
- All operations are undoable, autosaved, versioned, and replayable.

## Milestone 4 — Document processing and conversion

Priority: P1  
Estimated complexity: **XL**

### Dependencies

- Backend/job infrastructure from Milestone 2.
- Licensed/approved conversion and OCR engines.

### Deliverables

- Durable background jobs with queues, retries, cancellation, progress, idempotency, and dead-letter handling.
- Compress, PDF↔images, Office/images→PDF, PDF→Word, OCR, password protection, and comparison.
- Download retention, job audit events, resource quotas, and safe temporary-file handling.

### Acceptance criteria

- Jobs resume/retry safely and expose truthful progress/failure reasons.
- Conversion/OCR quality is measured against a representative fixture suite.
- Expensive jobs are quota-limited and isolated from interactive editor traffic.

## Milestone 5 — Sharing and signature workflows

Priority: P1  
Estimated complexity: **XL**

### Dependencies

- Milestone 2 authorization, versions, audit events, background jobs.
- Email provider, domain authentication, abuse controls, legal/compliance review.

### Deliverables

- Tokenized share links with permissions, password, expiration, revocation, and view events.
- Recipients, recipient-assigned fields, signing order, required fields, reminders, expiration, and public signing pages.
- Workflow states: draft, sent, viewed, completed, declined, expired.
- Reusable templates, sealed final artifact, certificate of completion, and immutable event history.

### Acceptance criteria

- Link and recipient permissions are enforced server-side for every document operation.
- Signing state transitions are validated and idempotent.
- Completion produces a tamper-evident artifact, certificate, and auditable event chain.
- Email failures, bounces, expirations, and revocations have recoverable product states.

## Milestone 6 — Teams, enterprise, and platform

Priority: P2  
Estimated complexity: **XL / multi-quarter**

### Dependencies

- Mature document/share/audit services.
- Billing, identity, compliance, and support operating models.

### Deliverables

- Organizations/workspaces, member invitations, owner/admin/editor/viewer RBAC, shared folders, granular ACLs.
- Organization templates, branding, admin dashboard, usage reporting, centralized billing, retention policies, exportable audit logs.
- SSO/SAML-ready identity abstraction, SCIM-ready provisioning model.
- API keys, OAuth clients/scopes, rate limits, webhook signing/retries, developer documentation.

### Acceptance criteria

- RBAC/ACL matrix is exhaustively integration-tested.
- Organization boundaries hold across documents, jobs, shares, templates, billing, logs, and API access.
- Admin actions and API/webhook events are immutable and exportable.
- SLOs, support runbooks, incident response, and compliance evidence are operational.

## Milestone 7 — Grounded document AI

Priority: P2  
Estimated complexity: **XL**

### Dependencies

- Versioned document service, OCR/extraction pipeline, authorization, audit, usage metering, and data-governance policy.

### Deliverables

- Page-addressable extraction/indexing and permission-aware retrieval.
- Summaries and chat with page/region citations and source previews.
- Structured/table extraction, clause identification, suggested form fields, sensitive-data detection, and layout-aware translation.
- Model/provider abstraction, prompt/version registry, eval suite, safety filters, cost limits, feedback, and deletion propagation.

### Acceptance criteria

- Every generated factual answer exposes verifiable document citations.
- AI never retrieves content the caller cannot access.
- Quality, latency, refusal, and cost targets pass a versioned evaluation suite before release.
- Users can identify AI output, report errors, and delete derived data.

## Cross-cutting release work

These are continuous dependencies, not a final cleanup phase:

- CI gates: lint, type checking or equivalent static analysis, unit, integration, end-to-end, build, dependency and secret scanning.
- Preview environments, controlled production promotion, migrations, feature flags, rollback, and incident runbooks.
- Accessibility testing at every milestone, including keyboard and screen-reader workflows.
- Responsive behavior with explicit supported viewport/device matrix.
- Privacy, retention, deletion, security review, threat modeling, abuse prevention, and vendor review.
- Product analytics based on real events only; no fabricated customer/enterprise metrics.

## Explicitly deferred from Milestone 1

OCR, conversion, compression, split/advanced merge, true redaction, password protection, collaboration, public sharing, email, signature delivery, organizations, billing, SSO, APIs, webhooks, and AI remain unavailable. Their current buttons must not imply otherwise.
