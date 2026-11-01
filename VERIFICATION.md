# Verification

## Passed

- Next.js production build with Next.js 16.4.3.
- Real Firebase Firestore emulator integration test with Firebase Admin SDK 14.5.0.
- The integration test covers account registration and login, club creation, forbidden non-officer actions, campaign creation, application and duplicate prevention, applicant privacy, interview and acceptance, automatic membership, final-decision protection, event creation, membership requirement, event capacity, duplicate registration, unique tickets, forbidden member check-in, concurrent duplicate check-in (one succeeds and one is rejected), unsafe resource URL rejection, task permissions, handover permissions, successful leadership transfer and preservation of records.
- No real database credentials are included in this package.

## Limits

- A browser preview was attempted but remained on the initial loading screen in the managed preview environment. The cause was not resolved; visual and end-to-end browser verification are incomplete. The successful production build and backend integration test do not prove every browser workflow works.
- No deployment was made into your Firebase, Render, or Vercel accounts. Live credentials, IAM permissions, hosting configuration, phone QR scanning, and free-tier behavior must be checked using DEPLOYMENT.md.
- Java 17 was available for the emulator test; Firebase CLI 14 warns that newer CLI versions require Java 21. Java 21+ is recommended in the local instructions.
