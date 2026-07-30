# PDFEnrich security and private document storage

Last reviewed: 2026-07-29

## Deployment status

This document describes controls implemented in this repository and the manual controls required before private cloud saving can be released.

**Private cloud saving is not deployed or verified from this workspace.** While `VITE_PRIVATE_CLOUD_API_BASE_URL` is blank, PDFEnrich remains browser-local and private cloud actions fail closed. Repository code, rules, tests, or runbooks are not evidence that IAM, App Check, CORS, malware scanning, backups, lifecycle policies, schedules, alerts, or production rules are active.

No design is “100% secure.” The remaining risks and required production verification are listed below.

## Security contact

Report suspected vulnerabilities privately to the operator of `pdfenrich.com`. Do not attach a real customer PDF, signature, access token, resumable session URL, storage path, or share/sign link. Use a synthetic PDF and a redacted request ID.

## Audited stack and data flow

- The application is a React 19 / Vite 6 single-page app.
- Firebase Authentication is the cloud identity provider. Browser-local fallback accounts are prototype-only identities and cannot authorize private cloud operations.
- Firebase App Check is initialized by the browser when configured. The API implementation requires a verified App Check token and an allowlisted app ID, but production configuration is not verified.
- PDF editing, rendering, OCR, conversion, signing, and export run in the browser. The application does not use a temporary server filesystem for document persistence.
- IndexedDB stores browser-local document bytes and editor recovery sessions. Account-scoped preferences and the optional local signature library use browser storage.
- Google Cloud Storage / Firebase Storage holds optional private PDF bytes. Firestore holds metadata, not v2 PDF blobs.
- Firebase Functions v2 provides the authenticated private-document API and scheduled reconciliation/retention jobs.
- The retired cloud path stored one mutable `document.json` workspace. New writes to that format are denied; the legacy bridge is owner-scoped and read/delete-only so a user can explicitly export and migrate.

## Browser-local default and explicit cloud opt-in

Opening, editing, autosaving, rendering, signing, OCR, and exporting do not enable cloud history. Signing in does not upload existing local documents.

A cloud upload starts only after the user selects **Save private cloud copy** for a document. The current edited PDF is rebuilt locally; the application does not upload editor history, separate signatures, form-value records, OCR output, thumbnails, or other browser documents. The UI distinguishes preparing, byte upload, server verification, success, cancellation, and retryable failure.

The client accepts success only when the API returns an active, verified version with matching server IDs, byte size, and SHA-256 checksum. A network `2xx` alone is not treated as confirmation. If the API is absent or unavailable, the local document remains usable.

## Private cloud storage model

The verified Firebase UID is taken from the server-verified ID token. The backend creates document and version IDs using cryptographic randomness. Client-supplied owner IDs, storage paths, version IDs, and routing fields are rejected.

Storage object:

```text
users/{urlEncodedVerifiedFirebaseUid}/documents/{serverDocumentId}/versions/{serverVersionId}.pdf
```

Firestore:

```text
users/{verifiedFirebaseUid}/privateDocuments/{serverDocumentId}
users/{verifiedFirebaseUid}/privateDocuments/{serverDocumentId}/versions/{serverVersionId}
users/{verifiedFirebaseUid}/privateCloudSettings/history
```

Server-only operational collections include `_privateCloudUsage`, `_privateCloudUploadIntents`, `_privateCloudRateLimits`, and `_privateCloudReconciliation`.

Metadata records include the immutable owner, document/version IDs, internal object key, sanitized display name, declared and verified size, `application/pdf` content type, expected and server-calculated SHA-256, object generation, page count, timestamps, current-version pointer, upload/validation/scanner state, and deletion/retention state.

`firestore.rules` and `storage.rules` deny direct browser access to v2 private-document metadata and objects. Downloads stream through the authenticated API; no Firebase `getDownloadURL` or permanent download token is used for private v2 PDFs.

When correctly configured, Google Cloud provides TLS in transit and provider-managed encryption at rest. Customer-managed keys, Public Access Prevention, uniform bucket-level access, lifecycle policies, object soft delete/versioning, and least-privilege IAM are manual deployment controls and are not verified here.

## Private API contract

Every route requires an allowlisted browser origin, verified Firebase ID token, and verified App Check token. The API uses bearer headers, not ambient cookies, and does not use `credentials: include`.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/v1/cloud-history` | Read the authenticated account's cloud-history setting |
| `PUT` | `/v1/cloud-history` | Set the explicit cloud-history preference |
| `POST` | `/v1/documents/uploads` | Reserve quota and create/reuse a resumable upload |
| `POST` | `/v1/documents/uploads/{64-hex-uploadId}/finalize` | Verify and atomically activate the uploaded version |
| `GET` | `/v1/documents` | List active documents, or active and trashed documents with `includeDeleted=true` |
| `GET` | `/v1/documents/{documentId}/versions` | List verified immutable versions |
| `GET` | `/v1/documents/{documentId}/download` | Stream the authorized current or selected version |
| `POST` | `/v1/documents/{documentId}/restore` | Restore a trashed document inside its recovery window |
| `POST` | `/v1/documents/{documentId}/versions/{versionId}/restore` | Verify and repoint to a previous immutable version |
| `DELETE` | `/v1/documents/{documentId}` | Move a document to trash and revoke linked shares |
| `DELETE` | `/v1/documents/{documentId}?permanent=true` | Permanently purge document versions, objects, shares, and metadata |
| `DELETE` | `/v1/account/data` | Synchronously purge account-owned application data after recent authentication |

Document and version selectors are validated fixed-shape internal IDs, then looked up only below the verified user's metadata root. A client query or body cannot replace the verified owner.

The account-data endpoint returns success only as `{ state: "complete", purgeConfirmed: true }` after re-querying the relevant data and confirming the storage prefix is empty. It deliberately does **not** disable or delete Firebase Authentication. After the confirmed backend purge, the client clears account-scoped browser data and then deletes the Firebase Auth identity. Any ambiguous or partial response stops identity deletion.

## Upload integrity and safe replacement

1. The client calculates SHA-256 and sends size, exact PDF MIME, sanitized display filename candidate, optional existing document ID, and an `Idempotency-Key`.
2. The backend validates the request, checks per-operation rate limits and account/document/version quotas, reserves bytes in a Firestore transaction, and creates pending document/version/upload-intent records.
3. The backend creates a private resumable GCS session for the exact server-generated key. The session URL is an ephemeral bearer capability and is never persisted by the browser.
4. Interrupted uploads query the session offset and continue. The user-scoped hash of the idempotency key prevents duplicate reservations and supports replay after a lost response.
5. Finalization pins and checks object generation, MIME, exact size, CRC32C transport validation, server SHA-256, the expected client checksum, scanner result, PDF structure, prohibited actions, and page count.
6. One Firestore transaction activates the immutable version, updates the current pointer, moves reserved bytes to active usage, completes the upload intent, and enables the account cloud-history setting.
7. A failed version never replaces the last active version. Terminal validation failures remove the object and reservation. Retryable validation or metadata failures keep non-active retryable state. Scheduled reconciliation handles stale reservations, missing objects, checksum mismatches, orphan objects, and failed purges.

The hard code limit is 50 MiB, 2,000 documents per account, and 100 versions per document. Deployment must set a per-file limit no greater than the hard limit and an account-byte quota at least as large as the per-file limit. These limits are not a substitute for billing and project quotas.

## Authentication, authorization, and application security

- Firebase Admin verifies ID tokens with revocation checking. The backend derives ownership only from the verified UID.
- App Check verification fails closed in the API implementation and checks an explicit application-ID allowlist.
- Account purge requires an authentication time no older than five minutes.
- Rate limits are persisted per verified actor and operation for cloud history, upload initiation/finalization, list, download, mutation, and account purge.
- The API accepts bounded JSON metadata only and does not accept PDF bytes in JSON.
- CORS is an exact-origin allowlist and permits only `GET`, `POST`, `PUT`, `DELETE`, and `OPTIONS` with the required authentication/idempotency headers.
- API responses use `no-store`, a deny-all API CSP, clickjacking protection, MIME-sniffing protection, no-referrer, and a restrictive permissions policy.
- The web application has CSP and no-store rules in `vercel.json` and `worker/index.js`; the deployed response headers must still be verified.
- Runtime credentials belong in function configuration or Secret Manager. No service-account key belongs in the browser or repository.

## PDF validation and malware scanning

Both client and server reject unsupported uploads. The server verifies:

- a `.pdf` display filename and exact `application/pdf` MIME;
- configured byte limit, `%PDF-` header, `%%EOF`, and unsupported trailing data;
- malformed or unsupported encrypted PDFs;
- detectable JavaScript, open/launch/remote actions, embedded files, rich media, and external annotation actions;
- object generation, actual size, checksum, parser timeout, and bounded page count.

Parsing has a total timeout and page cleanup. The Functions process has configured memory, timeout, concurrency, and maximum instances in code, but deployed resource limits must be verified.

Production defaults to requiring an HTTPS malware-scanner endpoint. The backend obtains an OIDC token for that endpoint and sends only the bucket, internal object key, generation, and checksum required to scan. Without a configured scanner, finalization fails closed unless `PRIVATE_CLOUD_REQUIRE_MALWARE_SCAN=false` is deliberately selected. A scanner is not considered active until its identity, isolation, logging, egress, engine updates, and clean/reject behavior are tested.

Structural validation and malware scanning reduce risk; they do not prove a PDF harmless. Do not add server-side OCR, conversion, or preview generation to the public HTTP function. Use an isolated, resource-bounded service with no unnecessary network access.

## Privacy, analytics, and logging

Private v2 PDF bytes are stored only in the private object bucket. They are not placed in Firestore, analytics, monitoring, URLs, or function log fields.

Application analytics accepts an allowlist of coarse event names and properties. It must not receive PDF bytes or text, signatures, form values, OCR output, thumbnails, filenames, private IDs, storage keys, checksums, access tokens, App Check tokens, resumable URLs, share capabilities, recipient/requester data, or raw provider errors.

The private API logger retains only bounded operational fields such as a random request ID, operation, outcome, stable error code, aggregate count, duration bucket, and a truncated one-way actor hash. Unknown provider errors become a stable generic response. Upload and document-processing request-body logging must be disabled or redacted at the platform layer; repository logging controls cannot disable provider access logs.

No repository code sends PDFs to an AI API or remote OCR/conversion service. The configured private malware scanner is a separate processor and must be operated under the disclosure, access-control, retention, and logging requirements above.

## Public sharing and signing: separate direct-Firebase flow

Public share/sign is not the v2 private-document API. It remains an explicit, Firebase client-rules flow:

- A link contains a 192-bit random capability in the URL fragment: `/share#token=...` or `/sign#token=...`. Fragments are not sent in the initial HTTP request.
- Only SHA-256 token hashes are used as Firestore record IDs and Storage object path segments: `shareLinks/{tokenHash}`, `signingRequests/{tokenHash}`, and `shares/{tokenHash}/document.pdf`.
- Share and signing records enforce active status and expiration. Owners can revoke them. Listing is denied.
- Recipient/requester names, email addresses, the message, and signing fields stay in the protected signing-request record rather than in the link.
- When a share references a v2 `sourceDocumentId`, Firestore/Storage rules require that source document to remain owner-matched and active. Trash/permanent/account purge removes linked share objects and signing records.
- A temporary read/revoke bridge exists for legacy 32-character token-path shares. New shares use hash IDs.

Important limitation: for this direct-Firebase flow, the token hash is itself a usable bearer lookup value. It can appear in Firebase/Storage resource access logs, and the client-rules path has no application-level per-capability rate limiter. The raw token still has high entropy and remains in the fragment, but hashing does not eliminate bearer-capability risk. A future hardened design should move share/sign retrieval and mutation behind an authenticated/rate-limited capability-exchange backend and use generic provider resource identifiers.

Anyone who receives a valid share link can copy the allowed bytes. A UI-level download restriction cannot prevent screenshots or extraction.

## Retention and deletion

- Browser-local documents remain until the user deletes them, clears site data, or the browser evicts storage.
- Deleting a local document removes its owner-scoped catalog entry and editor session. Account deletion also attempts to clear account-scoped local documents, sessions, signatures, and preferences.
- Cloud trash marks metadata unavailable, assigns a configured recovery deadline, and deletes linked shares/signing requests.
- Restore is allowed only before the recovery deadline and only after verifying the current immutable object.
- Permanent document purge removes all versions, pending intents, the private object prefix, linked share/sign records and objects, and metadata, then confirms the prefix and metadata are gone.
- Account-data purge requires recent authentication and synchronously removes the user's private object prefix, user document/settings tree, shares, signing requests, upload intents, rate-limit records, usage, account profile, and actor-linked analytics/support records. It preserves other users' data and leaves Firebase Auth identity deletion to the client after confirmation.

Provider backups, Firestore point-in-time recovery, and object soft-delete/version generations can retain encrypted recovery copies after logical deletion. The production operator must choose and disclose the actual maximum retention delay; no period is claimed by this repository.

## Backups, reconciliation, and restore

The code exports scheduled reconciliation every six hours and retention purge every 24 hours. They are not running until deployed and verified.

Reconciliation examines stale non-active uploads, active metadata with missing/mismatched objects, old objects without metadata, and failed purges. It can mark a current version unavailable, release expired quota, remove confirmed orphans, and retry purge. It never promotes an orphan or unverified version.

Production also requires manual configuration of:

- Firestore point-in-time recovery where available;
- scheduled managed Firestore exports to a separate access-controlled backup bucket/project;
- provider encryption and Public Access Prevention for backups;
- object soft delete or versioning with bounded lifecycle retention;
- documented backup frequency, retention, RPO, and RTO;
- alerting for missed exports, reconciliation faults, and restore drills;
- at least quarterly restore drills with synthetic data.

The repository contains a restore runbook, not evidence that a production restore has succeeded. See [docs/restore-procedure.md](docs/restore-procedure.md).

## Automated security evidence

Verified locally on 2026-07-29:

```text
node node_modules/vitest/vitest.mjs run tests/security
7 test files passed; 76 tests passed
```

These are unit, handler-contract, source-policy, parser, and in-memory service tests. They are not Firebase Emulator tests, deployed IAM tests, live bucket tests, scanner tests, backup tests, or a restore drill.

| Required case | Automated evidence in the verified suite | Remaining production evidence |
| --- | --- | --- |
| 1. User A cannot operate on User B's document | `private-cloud-service-reliability.test.js`; modified-ID route cases in `private-cloud-api-handler.test.js` | Firebase Emulator and deployed User A/User B CRUD/share matrix |
| 2. Modified document ID is not authority | `private-cloud-service-reliability.test.js`; parameterized API route tests | Deployed API smoke test |
| 3. Client storage path/owner cannot be substituted | `private-cloud-document-service.test.js` rejects routing fields and derives the key from verified UID/internal IDs | Live object-prefix and IAM test |
| 4. Unauthenticated access is denied | `private-cloud-api-handler.test.js` covers missing ID token and App Check | Deployed function and direct-SDK denial |
| 5. Expired/revoked public capabilities stop working | `private-cloud-policy-source.test.js` checks active/expiry/revocation rule shape | Firebase Emulator and live share/sign expiration/revocation test; no signed URL is used |
| 6. Failed upload is never shown active | `private-cloud-api-handler.test.js`; `private-cloud-service-reliability.test.js` | Injected GCS outage in staging |
| 7. Uploaded orphan after terminal failure is cleaned | terminal validation cleanup in `private-cloud-service-reliability.test.js` | Metadata-commit outage plus scheduled cleanup in staging |
| 8. Failed file upload leaves no active pointer | interrupted/session and reconciliation cases in `private-cloud-service-reliability.test.js` | Live resumable failure injection |
| 9. Interrupted upload retries idempotently | `private-cloud-service-reliability.test.js`; lost-finalize replay in `private-cloud-client-contract.test.js` | Browser/GCS interruption smoke test |
| 10. Oversized, malformed, disguised, encrypted, and active PDFs are rejected | `private-cloud-document-service.test.js`; `production-pdf-inspection.test.js` | Scanner corpus and staging resource-limit tests |
| 11. Sensitive content is absent from API logs/errors | `http-security.test.js`; redacted finalize error in `private-cloud-api-handler.test.js` | Platform access-log and analytics export review |
| 12. Document purge removes related assets | `private-cloud-service-reliability.test.js` covers versions, pending upload, share/sign, storage, metadata, and quota | Staging prefix/inventory confirmation |
| 13. Account purge removes only the target user's data | `private-cloud-service-reliability.test.js`; confirmation contract in `private-cloud-api-handler.test.js` and client test | Staging purge plus Firebase Auth client-deletion test |
| 14. Prior valid version can be restored | `private-cloud-service-reliability.test.js` verifies object/checksum and pointer change | Staging download/content comparison |
| 15. Direct private access is denied | `private-cloud-policy-source.test.js` is a rule-source regression check | Mandatory Firebase Emulator test and deployed rules/IAM verification |

Do not release private cloud saving based on this unit suite alone.

## Incident response

1. Blank the frontend cloud API URL and redeploy so local editing/export remains available while new cloud actions disappear.
2. If necessary, stop new API invocation, preserving a reviewed path for authorized download and deletion of already-active data.
3. Revoke affected credentials, service-account sessions, scanner access, App Check configuration, and public capabilities as applicable.
4. Preserve only privacy-safe operational evidence; never copy customer PDFs, tokens, storage keys, or recipient data into tickets or chat.
5. Identify affected generations and metadata through restricted internal tooling.
6. Repair the boundary, run the full User A/User B, rule emulator, failure-injection, deletion, and restore suites in staging, then deploy.
7. Restore only verified data into a quarantined environment before any production change.
8. Notify affected users and regulators when legally required, using confirmed facts rather than security guarantees.
9. Record root cause, detection gap, corrective controls, and regression tests.

## Remaining risks and limitations

- No production cloud/IAM/App Check/CORS/scanner/rules/indexes/schedules/backups/alerts/lifecycle configuration has been verified.
- The direct-Firebase share/sign token hash remains a bearer identifier visible in provider resource paths and lacks an application-level capability rate limit.
- Rule-source tests are not an emulator or deployed-policy test.
- Browser compromise, malicious extensions, XSS, or another person using the same browser profile can expose local documents. CSP and output escaping reduce but do not eliminate this risk.
- Resumable upload session URLs temporarily authorize writes to one exact object. They must not be logged, persisted, copied, or reported.
- PDF parsing and malware scanning cannot detect every malicious file.
- A service-account or backend compromise can bypass client rules. Least-privilege IAM, workload identity, alerts, and credential hygiene remain essential.
- Legacy JSON workspaces can contain editor state that is not safely or losslessly convertible on the server. Migration is explicit browser rebuild/export/save, never silent bulk promotion.
- Provider backup and soft-delete retention can delay physical erasure after logical deletion.
- Large synchronous account purges can fail or time out during provider outages. The client correctly stops Auth identity deletion unless the purge is confirmed; the operator must investigate/retry without reporting completion.

Operator procedures:

- [Private cloud deployment checklist](docs/private-cloud-deployment.md)
- [Rollback and migration rollback](docs/private-cloud-rollback.md)
- [Metadata and object restore procedure](docs/restore-procedure.md)
