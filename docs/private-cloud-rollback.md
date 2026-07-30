# Private cloud rollout, migration, and rollback

## Status and safety invariant

Private cloud is not active while `VITE_PRIVATE_CLOUD_API_BASE_URL` is blank. The invariant during rollout and rollback is:

> Local editing/export remains available, no browser-local document uploads automatically, and no unverified object is marked active.

Do not restore direct browser access to v2 private metadata or objects as a rollback shortcut.

## Safe rollout order

1. Deploy and verify Firestore/Storage rules, indexes, the dedicated runtime identity, exact-origin CORS, App Check, private bucket controls, scanner, Functions API, reconciliation, retention purge, alerts, and backups in development.
2. Run unit/security tests, Firebase Emulator rules tests, User A/User B IDOR tests, failure injection, deletion tests, and a synthetic restore drill.
3. Repeat in staging using only synthetic PDFs. Keep the frontend API URL blank until backend verification is complete.
4. Verify every route in [private-cloud-deployment.md](private-cloud-deployment.md), including resumable replay, lost-finalize replay, immutable version restore, trash, permanent purge, and confirmed account-data purge.
5. Set the staging `VITE_PRIVATE_CLOUD_API_BASE_URL`; verify local-only behavior still works when the API is blocked.
6. Deploy the production backend and controls without enabling the frontend URL.
7. After security/privacy/reliability approval, enable explicit cloud save for a small cohort.
8. Expand only after reviewing privacy-safe failures, latency, quota, reconciliation, deletion, and cost metrics.

Never upload browser-local documents as part of rollout.

## Rollback triggers

Rollback or contain the release if:

- any cross-account or unauthenticated private operation succeeds;
- direct browser access to a v2 private path succeeds;
- the UI reports saved before an active/verified terminal response;
- object/metadata/checksum reconciliation becomes inconsistent;
- terminal failures leave active metadata pointing to missing or unverified objects;
- permanent/account deletion reports completion without confirmation;
- logs, analytics, monitoring, or URLs contain protected values;
- quota, rate, origin, ID-token, or App Check controls fail open;
- scanner validation fails open or becomes stale/unavailable beyond the approved policy;
- an API outage interferes with browser-local edit/export;
- App Check blocks a material share of legitimate users;
- backup, scheduler, or restore evidence is missing for the approved release gate.

## Immediate frontend rollback

1. Blank `VITE_PRIVATE_CLOUD_API_BASE_URL` in the affected frontend environment.
2. Rebuild and redeploy the static frontend.
3. Verify **Save private cloud copy** is unavailable/fails closed and no cloud API call occurs.
4. Verify local open, edit, autosave, export, and local delete still work.
5. Do not delete active v2 data or alter current-version pointers as part of a UI rollback.

This is the preferred first containment step because it stops new browser cloud requests without removing already-saved data.

## Backend containment

There is no repository feature flag that disables only upload initiation. Do not claim route-selective shutdown unless an operator has configured and tested a gateway control.

Choose the least disruptive verified control:

1. Restrict new frontend access at the gateway/origin layer if a tested control exists.
2. Otherwise preserve the deployed backend while the frontend URL is blank so authenticated download, delete, and account purge remain possible.
3. If the API itself is compromised, restrict/disable invocation and communicate that cloud access is temporarily unavailable. Restore access only after a reviewed fix.
4. Let known in-flight finalization safely replay, or leave its metadata non-active for reconciliation. Never manually mark it active.
5. Preserve the last verified current-version pointer.
6. Run reconciliation only after reviewing whether the incident affects its mutation logic.

Do not deploy an older backend that cannot understand current metadata unless a forward-compatible reader and tested migration exist.

## Rules and IAM rollback

- Keep `users/{uid}/privateDocuments/**` and private `users/{uid}/documents/**` objects denied to browser SDKs.
- Never restore the retired owner-direct mutable JSON write rules.
- Tightening IAM/rules is safe only after confirming the runtime still supports authorized download, delete, reconciliation, and account purge.
- If a deployed rule accidentally grants access, deploy the approved deny-direct rules immediately, then test owner and non-owner reads/writes.
- If a rule accidentally blocks share/sign, do not broaden private v2 rules. Disable public link creation or deploy the reviewed narrow share/sign rule fix.

For a time-bounded legacy export:

- authorize the signed-in owner through the existing read/delete-only bridge or a reviewed backend;
- never allow create/update;
- never issue a permanent Storage download-token URL;
- never log the legacy object path or filename.

## Upload and metadata recovery

- An `uploading`/`validating` version is not saved.
- A failed scanner/PDF-policy result must remain non-active and be cleaned.
- A retryable metadata failure may retain a verified object attached to non-active upload/version metadata so the same user/idempotency operation can finalize again.
- Expired non-active reservations are released by reconciliation; object deletion must be confirmed before quota/metadata cleanup is reported.
- An object without metadata is never promoted. Once older than the safety threshold, reconciliation may delete it as an orphan.
- Missing/checksum-mismatched current objects are marked unavailable; do not silently switch to another version without an authorized restore.

## Legacy migration and rollback

Legacy format:

```text
users/{uid}/documents/{legacyDocumentId}
users/{uid}/documents/{legacyDocumentId}/document.json
```

Migration is explicit:

1. The verified owner reads the legacy record through the temporary owner-only bridge.
2. The browser validates the bounded legacy payload.
3. The user opens/rebuilds the edited PDF locally.
4. The user explicitly selects cloud save.
5. The backend creates a new v2 immutable PDF and returns an active/verified checksum result.
6. Only then may the legacy record be marked migrated or deleted.

Rollback rules:

- Keep legacy data read-only during the documented migration window.
- If v2 begin/upload/finalize fails, keep the legacy record and browser copy.
- Never batch-promote legacy JSON or infer that it is a final PDF.
- A v2 active version remains authoritative even if its source legacy record is retained for rollback.
- Reverting document content uses the authenticated version-restore route after object/generation/checksum verification, not an in-place overwrite.
- Account deletion must purge both legacy and v2 data before Firebase Auth deletion.

## Public share/sign rollback

New links use raw high-entropy tokens only in fragments and token hashes in Firebase record/object IDs. Do not reintroduce raw-token path links.

If share/sign authorization, expiration, source-document association, or deletion cascade is suspect:

1. Stop creating new public links in the frontend.
2. Revoke affected `shareLinks` records and delete associated `shares/{tokenHash}/` objects and `signingRequests/{tokenHash}` records through an owner-authorized/admin workflow.
3. Preserve no raw token or recipient data in incident tickets/logs.
4. Deploy narrow rule/code fixes and run Emulator expiration/revocation/list-denial tests.

Remember that the hash is a bearer lookup value in the current direct-Firebase design. Provider path logs require restricted access and retention.

## Account deletion failure

`DELETE /v1/account/data` is synchronous and succeeds only with:

```json
{ "state": "complete", "purgeConfirmed": true }
```

The backend leaves Firebase Auth intact. If purge times out, fails, or returns anything else:

1. Do not clear the local account or delete Firebase Auth.
2. Do not tell the user deletion completed.
3. Inspect only privacy-safe aggregate failure evidence.
4. Retry after the provider incident is resolved and confirm empty owner prefixes/queries.
5. Delete browser account data and Firebase Auth only after confirmed backend success.

Never disable/delete Auth first; doing so can strand data without an authenticated self-service deletion path.

## Backup/restore rollback

Provider object recovery and Firestore backups may have different recovery points. Follow [restore-procedure.md](restore-procedure.md) in a quarantined nonproduction project.

- Do not bulk import a backup over live metadata.
- Do not run the production mutating reconciliation job as a “dry run”; it has no report-only mode.
- Do not reactivate a deleted/expired record merely because it exists in a backup.
- Verify owner, exact object generation, size, SHA-256, state, and deletion status before any pointer change.
- Use a new prefix/project for inspection and a separately reviewed production change.

## Post-rollback verification

- Confirm the frontend API URL is blank and local-only edit/export works.
- Confirm no new upload reservations occur.
- Inventory active, non-active, unavailable, trashed, purge-failed, and orphan counts without identifiers.
- Confirm current active metadata still maps to the exact expected generation/checksum.
- Confirm direct v2 SDK access remains denied.
- Confirm public shares tied to trashed/deleted source documents are inaccessible.
- Confirm scheduler behavior is intentional (running, paused, or reviewed before resumption).
- Preserve privacy-safe evidence and add regression tests.
- Document root cause, impact, deletion/retention implications, remediation, approvers, and re-enable criteria.

Re-enable only after the complete staging gate in [private-cloud-deployment.md](private-cloud-deployment.md) passes.
