# Private product analytics deployment

The custom PDFEnrich product analytics pipeline is implemented with Firebase Authentication, a public validated Cloud Function, and a backend-only Firestore collection. It is separate from private PDF storage and never receives PDF bytes, filenames, extracted text, signatures, form values, or URLs.

## Required production rollout

1. Set `ANALYTICS_ALLOWED_ORIGINS` in the Firebase Functions environment to the exact production and staging browser origins.
2. Set `ANALYTICS_RETENTION_DAYS` (the checked-in example uses `365`).
3. Configure Firebase App Check for every production web app, verify anonymous and signed-in ingestion, then set `ANALYTICS_REQUIRE_APP_CHECK=true`.
4. Deploy `analyticsApi`, Firestore rules, and Firestore indexes/TTL from this repository.
5. Give the owner Firebase identity the custom claim `pdfenrichAdmin: true`. Refresh the owner's ID token after changing the claim.
6. Set `VITE_ANALYTICS_API_BASE_URL` in Vercel only when the function URL differs from the checked-in PDFEnrich Firebase project default.
7. Verify the exact production origin can send a consented anonymous event and an owner can query `/v1/admin/events`.

Example deployment commands are intentionally not embedded with a project ID. Select and verify the intended Firebase project in the CLI before deploying functions, rules, or indexes.

## Security model

- Firestore client rules deny every direct read and write to `productAnalyticsEvents`.
- The ingestion endpoint accepts only explicit event names and properties, caps JSON request size, rate-limits per function instance without persisting IP addresses, and derives authenticated identity from a verified Firebase ID token.
- The admin endpoint verifies both the Firebase token and the `pdfenrichAdmin` custom claim.
- Anonymous browser and session IDs are random values. They are not fingerprints and do not cross devices or browsers.
- Events are stored with a backend UTC timestamp and an `expiresAt` TTL field.
- The owner dashboard excludes `internalTraffic` by default.

## Verification checklist

- Anonymous page view → upload completion → editor open → feature → download appears as one visitor and session.
- Five uses of Add Text produce five uses and one unique feature user.
- Signup after anonymous use retains the same visitor ID while the backend adds the verified Firebase user ID.
- Normal users receive `403` from `/v1/admin/events` and cannot read Firestore events directly.
- A PDF with a sensitive filename produces no filename or document content in the event record.
- Blocking the analytics endpoint does not block upload, editing, saving, or download.
- Internal-device events are absent by default and visible when “Include internal traffic” is enabled.
