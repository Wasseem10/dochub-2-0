# Private cloud deployment and operator checklist

## Current status

The repository contains the private-cloud implementation, but the service is **not deployed or verified from this workspace**. PDFEnrich stays browser-local while `VITE_PRIVATE_CLOUD_API_BASE_URL` is blank. Do not enable the frontend variable until all applicable checklist items are complete in the matching environment.

Record real project IDs, regions, origins, app IDs, service accounts, limits, retention periods, backup schedules, and operators in the deployment system. Do not commit them to this repository.

## Implemented resources

Firebase codebase `private-cloud` uses Node 22 and exports:

- `privateCloudDocumentsApi` — HTTPS API, 540-second timeout, 2 GiB, maximum 10 instances, concurrency 1;
- `reconcilePrivateCloudDocuments` — every six hours, 540 seconds, 2 GiB, one instance, concurrency 1;
- `purgePrivateCloudRetention` — every 24 hours with the same scheduled limits.

The application expects the following API routes:

```text
GET    /v1/cloud-history
PUT    /v1/cloud-history
POST   /v1/documents/uploads
POST   /v1/documents/uploads/{uploadId}/finalize
GET    /v1/documents
GET    /v1/documents/{documentId}/versions
GET    /v1/documents/{documentId}/download
POST   /v1/documents/{documentId}/restore
POST   /v1/documents/{documentId}/versions/{versionId}/restore
DELETE /v1/documents/{documentId}
DELETE /v1/documents/{documentId}?permanent=true
DELETE /v1/account/data
```

Private object and metadata layout:

```text
gs://{private-bucket}/users/{urlEncodedVerifiedUid}/documents/{docId}/versions/{versionId}.pdf
users/{uid}/privateDocuments/{docId}
users/{uid}/privateDocuments/{docId}/versions/{versionId}
users/{uid}/privateCloudSettings/history
```

The backend, not the client, creates IDs and derives the owner and object prefix from the verified Firebase identity.

## Required runtime configuration

`functions/.env.example` lists every function variable read by `functions/src/config.js`:

| Variable | Requirement |
| --- | --- |
| `PRIVATE_CLOUD_ALLOWED_ORIGINS` | Comma-separated exact HTTPS browser origins; no wildcard |
| `PRIVATE_CLOUD_ALLOWED_APP_IDS` | Comma-separated exact Firebase App Check app IDs |
| `PRIVATE_CLOUD_SERVICE_ACCOUNT_EMAIL` | Dedicated runtime service account email |
| `PRIVATE_CLOUD_STORAGE_BUCKET` | Exact private Storage/GCS bucket name |
| `PRIVATE_CLOUD_MAX_FILE_BYTES` | Positive integer no greater than the 50 MiB hard limit |
| `PRIVATE_CLOUD_ACCOUNT_QUOTA_BYTES` | Positive integer at least as large as the file limit |
| `PRIVATE_CLOUD_TRASH_RETENTION_DAYS` | Positive integer; code allows at most 90 days and defaults to 30 only if omitted |
| `PRIVATE_CLOUD_REQUIRE_MALWARE_SCAN` | Keep `true` for production unless a reviewed exception is approved |
| `PRIVATE_CLOUD_MALWARE_SCANNER_URL` | Exact HTTPS private scanner audience/endpoint |

The frontend additionally requires the normal `VITE_FIREBASE_*` variables, `VITE_FIREBASE_APP_CHECK_SITE_KEY`, and eventually:

```text
VITE_PRIVATE_CLOUD_API_BASE_URL=https://{deployed-private-api-origin}
```

Keep that frontend value blank for local-only or rollback deployments.

## Complete operator checklist

### 1. Environment separation and change control

- [ ] Select separate Firebase/GCP projects for development, staging, and production.
- [ ] Confirm each frontend points only to its matching Auth, App Check, Firestore, Storage, Functions, and analytics environment.
- [ ] Confirm development/staging identities cannot access production Firestore, Storage, functions, scanner, backups, or logs.
- [ ] Select the region with legal/data-residency, latency, and service-availability requirements reviewed.
- [ ] Configure billing budgets, per-service quota alerts, and an accountable billing/security contact.
- [ ] Record the deployment commit, rule versions, index version, function artifact, and rollback owner.
- [ ] Verify no service-account JSON key, access token, scanner credential, Firebase private key, or real document exists in source history or build artifacts.

### 2. Firebase Authentication

- [ ] Enable only approved providers, currently email/password and/or Google.
- [ ] Add exact production and staging authorized domains.
- [ ] Review password policy, email-enumeration protection, redirect origins, and abuse controls.
- [ ] Verify revoked ID tokens are rejected by the API.
- [ ] Verify password and Google users can complete recent reauthentication before account deletion.
- [ ] Configure privileged owner analytics with the `pdfenrichAdmin` custom claim; do not use an email allowlist.
- [ ] Document incident-time token revocation and custom-claim removal.
- [ ] Confirm browser-local fallback accounts cannot obtain a valid private API session.

### 3. Dedicated runtime identity and IAM

- [ ] Create a dedicated runtime service account for the private-cloud codebase. Do not use a default broad project identity.
- [ ] Configure the function `serviceAccount` parameter with that exact identity.
- [ ] Grant only the Firestore entity read/write/delete and transaction permissions required for the listed collections.
- [ ] Grant only the selected bucket's object create/get/list/delete and resumable-upload permissions required by the implementation.
- [ ] Grant the runtime identity permission to invoke the private scanner and obtain the scanner's OIDC audience token.
- [ ] Grant the scheduler/runtime only the permissions required for reconciliation and retention purge.
- [ ] Do not grant project Owner, Editor, Storage Admin across unrelated buckets, service-account key creation, or user-management permissions.
- [ ] Do not create downloadable service-account keys. Use managed runtime identity/workload identity.
- [ ] Review effective permissions with IAM Policy Troubleshooter and a denied-operation test.
- [ ] Confirm the browser Firebase API key does not confer Admin/IAM access.

Exact custom-role permissions depend on the selected Firestore mode, bucket, scanner, and deployment tooling. Review effective calls rather than copying an unverified broad role.

### 4. App Check

- [ ] Register separate App Check web applications per environment with reCAPTCHA Enterprise or another approved provider.
- [ ] Put only the public site key in the matching frontend environment.
- [ ] Set `PRIVATE_CLOUD_ALLOWED_APP_IDS` to the exact expected app ID(s).
- [ ] Verify the runtime can call Firebase App Check token verification.
- [ ] Observe staging traffic and confirm legitimate browsers send `X-Firebase-AppCheck`.
- [ ] Confirm missing, invalid, expired, and wrong-app tokens fail closed.
- [ ] Enable production enforcement only after monitoring confirms the safe cutover.
- [ ] Document an owner-approved, time-bounded rollback for App Check false positives. Do not disable Firebase Auth verification as a workaround.

### 5. Private bucket and object policy

- [ ] Create/select a private bucket in the approved region.
- [ ] Enable Uniform bucket-level access.
- [ ] Enable Public Access Prevention.
- [ ] Remove and verify absence of `allUsers` and `allAuthenticatedUsers` IAM bindings.
- [ ] Confirm no v2 object has `firebaseStorageDownloadTokens` metadata.
- [ ] Confirm private v2 objects cannot be read through `getDownloadURL`, object ACLs, anonymous requests, or guessed URLs.
- [ ] Configure bucket CORS for only the exact frontend origins and resumable upload needs: `PUT`, `Content-Type`, `Content-Range`, and required response headers such as `Range`/`ETag`. Do not use `*` origins.
- [ ] Test create-resume-status-complete behavior from each allowed origin and denial from an unapproved origin.
- [ ] Configure object soft delete or object versioning as a recovery layer.
- [ ] Add bounded lifecycle rules for old noncurrent generations, abandoned uploads, and approved backup retention.
- [ ] Record the provider recovery window and estimated cost.
- [ ] Confirm provider encryption at rest. Configure and test CMEK only if the threat/compliance model requires it.

### 6. Firestore database, rules, and indexes

- [ ] Select the intended regional Firestore database.
- [ ] Deploy `firestore.rules`, `firestore.indexes.json`, and `storage.rules` to staging.
- [ ] Wait for all composite indexes to finish building before testing.
- [ ] Run Firebase Emulator tests with two users and an unauthenticated client.
- [ ] Verify direct browser reads/writes to `users/*/privateDocuments/*`, nested versions, cloud settings, and `users/*/documents/*` v2 objects are denied for both owner and non-owner.
- [ ] Verify the legacy `document.json` bridge is owner-only, read/delete-only, and cannot create/update.
- [ ] Verify the final catch-all rules deny all unspecified data/object paths.
- [ ] Verify public share/sign get rules require active, unexpired records and deny collection listing.
- [ ] Verify a share tied to a v2 document stops working when the source is trashed/unavailable.
- [ ] Export the deployed rules/indexes and compare them byte-for-byte or semantically to the approved release.

`tests/security/private-cloud-policy-source.test.js` is only a source regression check. It does not replace emulator or deployed-policy verification.

### 7. Malware scanner

- [ ] Deploy or select a private HTTPS scanner with a dedicated identity and an exact OIDC audience.
- [ ] Restrict invocation to the private-cloud runtime identity.
- [ ] Allow the scanner to read only the requested bucket/object generation; do not give it unrelated storage access.
- [ ] Validate the request tuple: bucket, internal object key, generation, and SHA-256.
- [ ] Disable request-body and document-content logging in the scanner and its ingress/proxy.
- [ ] Isolate the scanner with bounded memory, CPU, execution time, temporary storage, and egress.
- [ ] Configure engine/signature updates and alert when updates fail or become stale.
- [ ] Test known-clean, approved test-malware, timeout, malformed response, wrong generation, checksum mismatch, and unavailable-scanner cases.
- [ ] Confirm production `PRIVATE_CLOUD_REQUIRE_MALWARE_SCAN=true` fails closed.
- [ ] If a nonproduction environment deliberately sets it to `false`, label results `not_configured` and do not carry that configuration into production.

### 8. Function configuration and deployment

- [ ] Populate every required function variable using the environment's managed configuration mechanism.
- [ ] Store any future scanner secret in Secret Manager and bind it only to the function that needs it. The current implementation uses OIDC and does not define a static scanner-secret variable.
- [ ] Install the pinned `functions/pnpm-lock.yaml` dependencies under Node 22 and run tests.
- [ ] Deploy the `private-cloud` Functions codebase to staging.
- [ ] Deploy the scheduler jobs and verify the scheduler identity can invoke them.
- [ ] Confirm the HTTPS API URL and its actual region.
- [ ] Confirm the deployed runtime identity matches `PRIVATE_CLOUD_SERVICE_ACCOUNT_EMAIL`.
- [ ] Verify 540-second timeout, 2 GiB memory, concurrency 1, and instance caps for all three exports.
- [ ] Apply lower caps if load/security testing supports them; do not raise them without abuse/cost review.
- [ ] Verify the function rejects unallowlisted origins before token verification.
- [ ] Verify ID token revocation checking and App Check allowlisting in deployed traffic.
- [ ] Confirm every response has `Cache-Control: no-store`, CSP, no-referrer, MIME-sniffing, and framing protections.

### 9. Platform logging and observability privacy

- [ ] Disable request/response body capture for the private API, upload session, scanner, and document-processing routes.
- [ ] Review ingress, load-balancer, Cloud Run, Functions, Storage, Firestore audit, scanner, CDN, analytics, and monitoring exports.
- [ ] Confirm logs never include Authorization/App Check headers, resumable session URLs, filenames, object keys, SHA-256 values tied to a user, document text, signatures, form values, OCR output, recipient/requester data, or raw share tokens.
- [ ] Treat token-hash resource paths in share/sign provider logs as bearer-capability exposure and restrict access/retention accordingly.
- [ ] Use privacy-safe counters for outcome, stable error code, duration bucket, rate-limit count, and aggregate reconciliation count.
- [ ] Configure alerts for finalization failures, authorization failures, quota/rate rejection spikes, download failures, scanner faults, checksum/PDF-policy rejection spikes, stale uploads, missing/orphan objects, purge failures, scheduler failures, backup failures, and cost anomalies.
- [ ] Test alert delivery and escalation ownership.

### 10. API staging verification

Use only synthetic PDFs and test accounts.

- [ ] `GET`/`PUT /v1/cloud-history` is owner-bound and rejects extra fields.
- [ ] Upload begin accepts only exact metadata and takes idempotency only from the header.
- [ ] The resumable session accepts only the intended object and resumes from a verified offset.
- [ ] Finalize pins object generation and verifies MIME, size, server SHA-256, scanner, PDF policy, and page count.
- [ ] A lost begin/finalize response replays without duplicate quota or active versions.
- [ ] A terminal validation failure removes object and pending reservation.
- [ ] A retryable metadata failure keeps non-active data and can finalize safely later.
- [ ] List pagination and trashed-document filtering are correct.
- [ ] Downloads are authenticated proxy streams, use a safe filename header, and never return a permanent URL.
- [ ] Previous versions remain immutable and restore only after object/generation/checksum verification.
- [ ] Trash revokes linked shares; restore respects the configured recovery window.
- [ ] Permanent delete confirms all object generations, versions, pending intents, linked share/sign data, quota, and metadata are gone.
- [ ] Account purge requires an authentication time within five minutes, removes only the target account's application data, returns only after confirmation, and leaves Firebase Auth for client deletion.
- [ ] User A cannot list, download, restore, trash, purge, version, or associate a share with User B's document by modifying an ID.
- [ ] Direct object-path and Firestore-path substitution fails.
- [ ] Unknown errors expose only stable public codes/messages.

### 11. Required 15-case automated and integration gate

- [ ] Run `tests/security` and record exact test file/count results for the release commit.
- [ ] Run the full unit/integration suite and fix every failure.
- [ ] Add/run Firebase Auth/Firestore/Storage Emulator coverage; source-regex tests are insufficient.
- [ ] Map each of the 15 required cases in `SECURITY.md` to the release evidence.
- [ ] Run live staging failure injection for GCS upload, Firestore activation, scanner outage, and function timeout.
- [ ] Run the cross-user IDOR matrix with User A, User B, and unauthenticated clients.
- [ ] Review logs/analytics exports after testing with a unique synthetic marker and confirm the marker, filename, and PDF bytes are absent.
- [ ] Do not treat a successful HTTP status as storage proof; inspect confirmed active metadata and the exact generation.

The repository security suite was verified locally on 2026-07-29 at 7 files / 76 tests, but emulator/live-cloud verification remains required.

### 12. Frontend and hosting release

- [ ] Verify browser-local editing, autosave, export, and deletion with the API URL blank.
- [ ] Verify signing in does not upload local documents or filenames.
- [ ] Verify the first cloud request occurs only after **Save private cloud copy** confirmation.
- [ ] Verify progress, retry, cancellation, checksum verification, and failure copy with screen readers and keyboard/touch input.
- [ ] Update CSP `connect-src` to include only the exact deployed function origin plus required Firebase/GCS endpoints.
- [ ] Deploy and verify Vercel/Sites security headers and no-store behavior on `/app/*`, auth pages, `/share`, and `/sign`.
- [ ] Set `VITE_PRIVATE_CLOUD_API_BASE_URL` only in staging first.
- [ ] Confirm an API outage does not block local edit/export and never reports a cloud save.
- [ ] Release to a small production cohort only after security/privacy approval and observability verification.
- [ ] Expand only after the rollback owner reviews privacy-safe failure, latency, and deletion metrics.

### 13. Public sharing and signing

- [ ] Verify generated links use `/share#token=...` and `/sign#token=...`; no new raw-token path links.
- [ ] Verify only 64-hex SHA-256 token hashes appear as Firestore/Storage IDs for new links.
- [ ] Verify recipient/requester/message/field data exists only in `signingRequests/{tokenHash}`, never the URL.
- [ ] Verify active, expiration, completion, owner revocation, and source-document state rules in the Emulator.
- [ ] Verify listing `shareLinks`, `signingRequests`, and `shares` is denied.
- [ ] Confirm trash/permanent/account purge cascades to linked share/sign records and objects.
- [ ] Restrict provider log access and retention because the token hash remains a usable bearer lookup value.
- [ ] Document the lack of application-level per-capability rate limiting in the risk register.
- [ ] Plan a backend capability-exchange migration before representing share/sign as equivalent to private v2 backend authorization.

### 14. Legacy migration

- [ ] Inventory legacy `users/{uid}/documents/{id}` metadata and `document.json` objects using aggregate counts only.
- [ ] Verify the owner-authorized read/delete bridge before tightening rules.
- [ ] Notify users of the explicit migration path and rollback window.
- [ ] Never silently upload local files or bulk-promote mutable workspace JSON.
- [ ] The user opens the legacy workspace, exports/rebuilds a PDF locally, explicitly chooses cloud save, and waits for a verified v2 active version.
- [ ] Mark migration complete only after server checksum/object/metadata confirmation.
- [ ] Keep legacy data read-only for the documented window.
- [ ] Delete legacy data through a retryable owner-authorized workflow after notice.
- [ ] Confirm account purge also removes the legacy user subtree/object prefix.

### 15. Backups, version recovery, and restore

- [ ] Enable Firestore point-in-time recovery if supported by the selected edition/region.
- [ ] Create a separate restricted backup project/bucket with Public Access Prevention and provider encryption.
- [ ] Configure scheduled managed Firestore exports and alert on missed/failed exports.
- [ ] Record the actual export frequency, retention, RPO, RTO, legal holds, and deletion delay.
- [ ] Restrict export/restore permissions to a small break-glass group with alerts and time-bounded access.
- [ ] Configure object soft delete/versioning and bounded lifecycle retention compatible with metadata backups.
- [ ] Test in-app immutable-version restore through the authenticated API.
- [ ] Run [restore-procedure.md](restore-procedure.md) in a quarantined staging project with a synthetic tenant.
- [ ] Record recovered/missing/mismatched/orphan/skipped aggregate counts and elapsed time.
- [ ] Obtain a second-person approval, destroy the quarantine, and revoke temporary access.
- [ ] Schedule at least quarterly restore drills and alert on missed drills.

### 16. Reconciliation and retention schedules

- [ ] Verify `reconcilePrivateCloudDocuments` runs every six hours under the dedicated identity.
- [ ] Seed synthetic stale uploads, missing objects, checksum mismatch, orphan objects, and failed purge; verify the expected safe state and aggregate alert.
- [ ] Confirm reconciliation never promotes an unverified version.
- [ ] Verify `purgePrivateCloudRetention` runs daily.
- [ ] Verify expired trash purge removes every generation/record and confirms deletion.
- [ ] Verify operational intent/rate-limit records expire without deleting active document data.
- [ ] Monitor schedule freshness and failed invocations.

### 17. Account-deletion release gate

- [ ] Test password and Google recent reauthentication.
- [ ] Verify an ambiguous, timed-out, or partial `/v1/account/data` result prevents browser cleanup and Firebase Auth deletion.
- [ ] Verify `{ state: "complete", purgeConfirmed: true }` is returned only after storage and metadata re-checks.
- [ ] Verify the backend does not disable, revoke, or delete Firebase Auth during its purge.
- [ ] Verify client cleanup removes the deleting account's local documents, editor sessions, signatures, and preferences without deleting another local account's data.
- [ ] Verify the client deletes Firebase Auth only after backend and browser confirmations.
- [ ] Document how support retries a timed-out purge without falsely telling the user it completed.

### 18. Final production approval

- [ ] Security reviewer signs off on authentication, authorization, rules, IAM, scanner, logging, and test evidence.
- [ ] Privacy reviewer signs off on disclosures, third parties, retention, deletion, backup delay, and share/sign limitations.
- [ ] Reliability reviewer signs off on quotas, retry/idempotency, reconciliation, outage behavior, backups, and restore drill.
- [ ] Product owner confirms local-only remains the default and cloud language does not overclaim.
- [ ] Rollback owner has exercised [private-cloud-rollback.md](private-cloud-rollback.md).
- [ ] Only then set the production API URL and enable the explicit cloud-save UI.

## Post-deployment evidence to retain

Retain configuration/evidence references, not user data:

- deployment commit and artifact digests;
- deployed function/rule/index versions;
- service-account effective-permission review;
- App Check and exact-origin denial results;
- test command summaries and synthetic account IDs stored in the secure test system;
- lifecycle/PITR/export policy identifiers;
- latest reconciliation and restore-drill aggregate result;
- alert-routing test;
- approvers and rollback owner.

Never place filenames, UIDs, emails, object keys, checksums, tokens, session URLs, request bodies, or PDF/parser text in the release record.
