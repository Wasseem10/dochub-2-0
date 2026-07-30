# PDFEnrich metadata and object restore procedure

## Status

This is an operator runbook, not evidence that Firestore PITR, managed exports, object soft delete/versioning, or a production restore is configured or tested. Record a successful synthetic staging drill before relying on the stated recovery process.

Use synthetic or formally approved recovery data only. Never restore production customer PDFs to a developer workstation.

## Two different restore operations

1. **User version restore** uses:

   ```text
   POST /v1/documents/{documentId}/versions/{versionId}/restore
   ```

   The API owner-checks the document, verifies the immutable object's exact generation, size, SHA-256, and PDF envelope, then transactionally changes the current pointer. It does not delete later versions.

2. **Disaster/backup restore** reconstructs Firestore metadata and Storage generations in a quarantined project. It requires the procedure below and a separate approved production change.

Do not use a backup import for normal user version restore.

## Preconditions

- [ ] An incident commander and second approver authorize the restore.
- [ ] Legal/privacy review confirms that restoring deleted data is permitted for this incident.
- [ ] The source backup/export and object generations predate the incident and have successful provider job status.
- [ ] The destination is a quarantined nonproduction Firebase/GCP project with Public Access Prevention, no public app, no analytics, no emails, no public sharing, and restricted egress.
- [ ] A dedicated time-bounded break-glass identity can read only the selected backup and write only to the quarantine.
- [ ] Firestore rules, indexes, Storage rules, function version, and object layout for the selected recovery point are known.
- [ ] Expected aggregate user/document/version/object counts are recorded without filenames, UIDs, paths, checksums, or personal data.
- [ ] A deletion/legal-hold ledger exists so the restore does not reactivate data deleted after the backup.
- [ ] The rollback owner has a plan to destroy the quarantine and revoke access.

## Quarantined restore drill

1. Record the backup timestamp, object recovery timestamp, destination, incident/change ID, approvers, and expected aggregate counts.
2. Create a new quarantine project/bucket or empty approved restore destination. Never overwrite live production.
3. Apply Public Access Prevention, uniform bucket-level access, restricted IAM, and audit alerts before importing data.
4. Import the selected Firestore managed export into the quarantine.
5. Restore only the required Storage object generations into the quarantine, preserving the expected object names and generation evidence.
6. Do **not** deploy the public frontend or enable public share/sign reads in the quarantine.
7. Create a read-only inventory with a separately reviewed script supplied for the drill, or compare provider inventories manually. No read-only inventory script is included in this repository. The scheduled reconciliation function mutates state and has no report-only mode; do not run it as a dry run.
8. For every candidate active version, verify:
   - metadata path owner matches the stored immutable `ownerId`;
   - document and version IDs match the fixed internal format;
   - object key equals `users/{urlEncodedUid}/documents/{docId}/versions/{versionId}.pdf`;
   - exactly the intended object generation exists;
   - content type is `application/pdf`;
   - actual size and server SHA-256 match metadata;
   - PDF validation succeeds under the release parser/policy;
   - document current pointer references an active verified version;
   - state and timestamps are coherent.
9. Inventory without mutation:
   - active metadata with missing objects;
   - objects with no metadata;
   - size/checksum/generation mismatches;
   - stale uploading/validating/cleanup records;
   - purging/purge-failed documents;
   - shares/signing records that are expired, revoked, completed, or tied to non-active source documents.
10. Apply the deletion/legal-hold ledger. Deleted, expired, or revoked application records must remain inaccessible even if the backup predates deletion. Do not reactivate public capabilities.
11. With synthetic test identities only, exercise authenticated list/download/version restore and confirm a second user receives a generic not-found/forbidden result.
12. Run the approved scanner/PDF corpus checks in the isolated environment.
13. Record only aggregate recovered, missing, mismatched, orphan, skipped, still-deleted, and failed counts plus elapsed time.
14. Obtain the second approver's sign-off.
15. Destroy the quarantine and temporary objects after the approved evidence-retention period, then revoke break-glass access and verify deletion.

## Production recovery

Production recovery requires a separate, peer-reviewed change. Prefer a forward repair to an in-place rollback.

1. Restore metadata and objects into a new project/prefix first.
2. Complete every verification above.
3. Exclude records that must remain deleted, expired, revoked, quarantined, or unavailable.
4. For each selected record, prepare an idempotent, owner-preserving repair plan that names the exact destination generation internally.
5. Pause conflicting writes only for the minimum reviewed window.
6. Copy/restore objects first as noncurrent/non-active data.
7. Write version metadata as non-active until the destination object generation, size, checksum, parser, and scanner result are verified.
8. Change a current-version pointer only in a transaction after verification. Never bulk overwrite current pointers.
9. Re-run owner-isolation, direct-rule-denial, list/download, delete, and reconciliation checks.
10. Resume traffic gradually and monitor privacy-safe aggregate errors.

If metadata is present but an object is unavailable, mark the version/document unavailable; never invent bytes or promote another version without an authorized restore decision.

## Backup coverage and limitations

- Firestore exports/PITR and Storage soft-delete/version generations can have different recovery points.
- A Firestore export alone does not contain PDF object bytes.
- Object recovery alone does not prove ownership, lifecycle state, or current-version selection.
- Reconciliation can identify inconsistencies but cannot recreate missing PDFs.
- Restoring from backup can conflict with a user's later deletion request. Restored copies must remain blocked and be re-deleted unless a lawful, approved exception applies.
- Public share/sign records are bearer-capability records. A restored active record must not become public merely because it was active at the backup timestamp.
- The exact RPO, RTO, export frequency, soft-delete/version retention, backup retention, and maximum physical-erasure delay are deployment choices. Record them only after verifying production configuration.
- CMEK is not configured by this repository. If selected, verify backup key availability and recovery procedures without broadening key access.
- A large recovery can exceed function/query quotas; use reviewed batch tooling and provider guidance rather than the public API.

## Required drill record

Store the following in the restricted operations system:

- release commit and function/rule/index versions;
- source backup/export job ID and timestamp;
- object recovery point;
- destination quarantine identifier;
- aggregate expected and observed counts;
- elapsed time and measured RPO/RTO;
- validation/scanner versions;
- approval and destruction confirmation;
- gaps, corrective actions, and next drill date.

Do not store filenames, account emails, UIDs, object paths, checksums, raw errors, share tokens/hashes, signing-party data, or document excerpts in the drill record.
