# ClubOS · Vantra

A working university club management demo, based on the attached Vantra proposal.

**Next.js (Vercel) → Express (Render) → Firebase Cloud Firestore.**

Start with [DEPLOYMENT.md](DEPLOYMENT.md) for exact deployment steps and environment values.

## What works

- Register and sign in; hashed passwords and an HttpOnly session cookie.
- Create multiple clubs; each has its own president, officers, and members.
- Open / close recruitment campaigns; apply, track status, interview, accept, decline.
- Accepting an applicant automatically creates their club membership.
- Assign officers and committees; export members to CSV.
- Create capacity-limited events; register; show a personal QR attendance ticket.
- An officer scans a ticket with a phone's camera / QR reader, signs in, and confirms attendance. A ticket link or code can also be pasted into Check in.
- Duplicate registrations and duplicate check-ins are rejected on the server.
- View / export attendance; save document links and club tasks.
- Transfer presidency to an existing member with notes; retain records and handover history.
- Responsive interface, real database persistence, optional seeded demo accounts.

## Files

```text
clubos/
  frontend/       Next.js App Router, UI and same-origin API proxy
  backend/        Express API, Firebase Admin SDK, emulator integration test
  firebase.json   Optional emulator settings
  firestore.rules Deny direct browser access; API uses Admin SDK
  render.yaml     Optional Render Blueprint
  DEPLOYMENT.md   Full deployment, environment variables and troubleshooting
  DEMO.md         Suggested presentation walkthrough
  VERIFICATION.md Checks performed and limits
```

Both apps have **package-lock.json**. Run `npm ci` inside `frontend` and `backend`; the repository root has no npm package.

## Run locally with a real Firebase project

Install Node.js 22. Copy the example files:

```bash
cd backend
npm ci
cp .env.example .env
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.
Fill in Firebase credentials and JWT_SECRET in `backend/.env` as explained in DEPLOYMENT.md, then:

```bash
npm run dev
```

In a second terminal:

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Its API_URL is http://localhost:4000. The API checks database access at http://localhost:4000/api/health.

## Run without Firebase credentials (local emulator)

Install Java 21+ and Node.js 22. From the repository root, after installing both apps:

```bash
./backend/node_modules/.bin/firebase emulators:start --only firestore --project demo-clubos
```

On Windows PowerShell the executable is `./backend/node_modules/.bin/firebase.cmd`.

In `backend/.env`, set `FIREBASE_PROJECT_ID=demo-clubos`, `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`, and a 32+ character JWT_SECRET. Do not set Firebase email or private key for the emulator. Optionally enable `SEED_DEMO=true` and set DEMO_PASSWORD (10+ characters). Start the backend and frontend as above. Emulator data is temporary unless explicitly exported/imported with the Firebase CLI.

To run the integration test in an isolated emulator, stop any running emulator first, then from the root:

```bash
./backend/node_modules/.bin/firebase emulators:exec --only firestore --project demo-clubos "npm --prefix backend test"
```

The test refuses to run without the emulator environment variable. It never connects to production Firebase.

## Implementation boundaries

This is an MVP demo. Document storage is by external links, QR scanning uses the phone's camera/QR app, and reports are CSV. No payment system, email notifications, password reset, file uploads, in-app camera scanner, or Zalo integration is included. Accounts are managed by the Express API; Firebase Authentication is not used. Lists are intentionally simple and not paginated, so this is intended for a small club demo rather than a large university deployment. Actions refresh data; this is not a live Firestore subscription. Demo seed data is created once and never resets user changes.
