# Deploy ClubOS: Firebase → Render → Vercel

Use this order. You do not need Docker, SQL, an ORM, Firebase Hosting, Cloud Functions, or a paid database.

## 1. Prepare the repository

1. Extract the ZIP. Open the `clubos` folder. It must contain `frontend`, `backend`, and this guide.
2. Install Node.js 22 locally if you want to run it on your computer.
3. Create an empty GitHub repository (a private repository is fine).
4. Upload the **contents of `clubos`** so that `frontend/` and `backend/` are at the GitHub repository root. Do not upload the enclosing `clubos` folder as another nested directory.
5. Never upload a downloaded Firebase service account JSON, `.env`, `.env.local`, `node_modules`, or `.next`. The ZIP contains only `.env.example` templates, no working credentials.

Using Git from inside the extracted `clubos` folder:

```bash
git init
git add .
git commit -m "Add working ClubOS demo"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

If you get a repository authentication error, sign in with GitHub Desktop or your normal Git credential manager.

## 2. Create Firebase Firestore

1. Go to https://console.firebase.google.com/ and choose **Create a project**.
2. Name it `clubos-demo` or any available name. You can disable Google Analytics for this demo.
3. Use the **Spark / no-cost** plan. This app does not need Blaze, Cloud Functions or Storage.
4. Open **Build → Firestore Database → Create database**. Select **Standard edition**, the **(default)** database, and **Production mode**. If the console offers a choice of connection modes, choose native Firestore, not MongoDB compatibility.
5. Choose a nearby region, ideally close to your Render region. The location cannot be changed later for this database.
6. In the **Rules** tab, replace the rules with the contents of `firestore.rules`, then click **Publish**:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if false; }
  }
}
```

These rules intentionally reject browser access. Only the Render backend accesses Firestore using the Firebase Admin SDK, which uses IAM credentials and bypasses Firestore client rules. Server routes enforce club permissions. Do not enable public reads/writes to fix a connection problem.

7. Open **Project settings → Service accounts → Firebase Admin SDK → Generate new private key**. Download the JSON file and keep it private.
8. Open it locally. You need exactly these three JSON fields:

| JSON field | Render environment variable |
| --- | --- |
| `project_id` | `FIREBASE_PROJECT_ID` |
| `client_email` | `FIREBASE_CLIENT_EMAIL` |
| `private_key` | `FIREBASE_PRIVATE_KEY` |

You do not need a Firebase browser app registration, web API key, authorized domain, or Firebase Authentication provider for this implementation.

## 3. Create the Render backend

1. Open https://dashboard.render.com/ and sign in.
2. Choose **New → Web Service**. Connect GitHub and select your repository.
3. Configure these fields:

| Field | Exact value |
| --- | --- |
| Name | `clubos-api` (or any available name) |
| Branch | `main` |
| Runtime | `Node` |
| Region | A region near your Firestore location |
| Root Directory | `backend` |
| Build Command | `npm ci --omit=dev` |
| Start Command | `npm start` |
| Instance Type | **Free** |
| Health Check Path | `/api/health` |

4. Add the following **Environment Variables** before deploying:

| Key | Value / source |
| --- | --- |
| `NODE_VERSION` | `22` |
| `NODE_ENV` | `production` |
| `FIREBASE_PROJECT_ID` | `project_id` from your downloaded JSON |
| `FIREBASE_CLIENT_EMAIL` | `client_email` from your downloaded JSON |
| `FIREBASE_PRIVATE_KEY` | Full `private_key` value; see below |
| `JWT_SECRET` | Your own random secret, at least 32 characters |
| `SEED_DEMO` | `true` to create sample data; otherwise `false` |
| `DEMO_PASSWORD` | A password you choose, at least 10 characters; required when SEED_DEMO=true |

Generate a JWT secret locally:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Paste the output into Render's JWT_SECRET field. Do not put it in Vercel, source code or chat.

### Private key: paste it correctly

In Render, paste the full JSON `private_key` **value only**, without the surrounding JSON quotes, field name, or comma. Keep the BEGIN/END markers. You can paste it as one line containing literal `\n` sequences:

```text
-----BEGIN PRIVATE KEY-----\nYOUR_ACTUAL_KEY_BODY\n-----END PRIVATE KEY-----\n
```

The code replaces literal `\n` with real newlines. Pasting the actual multiline private key also works. The placeholder above is not a usable key. Never prefix this variable with NEXT_PUBLIC_.

5. Do **not** add FIRESTORE_EMULATOR_HOST on Render. Do not manually set PORT; Render supplies it.
6. Click **Deploy Web Service**.
7. Wait for `ClubOS API ready` in the logs. If seeding was enabled, the first deployment also logs `Demo workspace created.`
8. Copy your actual Render URL, for example `https://clubos-api-xxxx.onrender.com`.
9. Open `https://YOUR-ACTUAL-RENDER-HOST/api/health`. Expected response:

```json
{"ok":true,"database":"firestore"}
```

10. After the first successful seed, set `SEED_DEMO=false`, remove DEMO_PASSWORD from Render, and redeploy. The database retains the demo accounts and club. Changing DEMO_PASSWORD later does not change passwords already saved in the database.

The `render.yaml` file is an optional Blueprint alternative. The manual steps above are simpler for a first deployment. For a Blueprint, set its prompted Firebase variables and keep seeding off unless you also configure DEMO_PASSWORD.

## 4. Create the Vercel frontend

1. Open https://vercel.com/new and import the same GitHub repository.
2. Use the Hobby plan for a personal, non-commercial student demo. Review Vercel's current plan terms before using it commercially.
3. Configure:

| Field | Exact value |
| --- | --- |
| Framework Preset | `Next.js` |
| Root Directory | `frontend` |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | Leave the Next.js default; do not set `out` or `dist` |
| Node.js Version | `22.x` |

4. Add this **server-side** environment variable:

| Key | Value |
| --- | --- |
| `API_URL` | Your real Render origin, e.g. `https://clubos-api-xxxx.onrender.com` |

Use the origin only, with no `/api` suffix and no quotes. Do not use localhost. Set it for **Production**, **Preview**, and **Development** if you want those environments to share this backend. Preview deployments will then use the same database; use separate projects if you need isolated demo data.

No NEXT_PUBLIC variables are required. Firebase credentials and JWT_SECRET go only on Render. The browser calls Next.js `/api` routes; Next.js talks to Render. This avoids cross-site cookie problems and does not require CORS configuration.

5. Click **Deploy**.
6. Open the Vercel URL, sign in or create an account, and create a club if you did not seed data.
7. If you change API_URL later, choose **Redeploy** in Vercel so the updated environment is used. Render changes also need a redeploy/restart.

## 5. Sign in to the sample workspace

Only available if `SEED_DEMO=true` was used successfully on a fresh database:

| Account | Email | Password |
| --- | --- | --- |
| President | `president@vantra.demo` | The DEMO_PASSWORD you set before first seed |
| Member | `member@vantra.demo` | The same initial DEMO_PASSWORD |

There is no hardcoded public demo password. Use private/incognito windows to demonstrate different users at the same time.

For an unseeded setup, anyone can register and create a club; the creator becomes that club's president. Another user joins through a campaign and is accepted by an officer.

## 6. Confirm the deployment works

1. Create a new student account in another browser or incognito window.
2. On the president account, open Recruitment and create a campaign with a future deadline.
3. On the student account, select that club and apply.
4. On the president account, click the workspace refresh button, open the application, advance to Interview, then Accept.
5. On the student account, refresh the workspace. It should show Member permissions.
6. On the president account, create a future event with capacity 1.
7. On the student account, register and open the QR ticket.
8. On a phone signed in as president/officer, scan the QR with the phone camera and confirm attendance. Alternatively copy the student's ticket link and paste it into Events → Check in in the president's browser.
9. Repeat check-in: it should reject the duplicate. Export the attendance CSV.
10. Add a knowledge link and a task. Complete the task.
11. Open Handover, select the student, enter notes and confirm. The student becomes president; the former president becomes officer. Club records remain.

## 7. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `npm ci` says there is no lockfile | Run it in `frontend` or `backend`, not the repository root. Both lockfiles are supplied. Ensure they were uploaded to GitHub. |
| Render cannot find package.json | Root Directory must be `backend`, not the repository root. |
| Vercel cannot find Next.js | Root Directory must be `frontend`. |
| Firebase PEM / private key error | Paste the complete private_key value without JSON quotes; keep BEGIN/END and newlines / literal `\n`. |
| Firestore NOT_FOUND or database missing | Create the `(default)` Firestore Standard database in the same project as the service account. |
| Firestore permission denied | Check service account project and IAM permission (Cloud Datastore User or Firebase Admin role as appropriate). Opening client rules will not fix Admin SDK IAM permissions. |
| `Set API_URL...` | Add API_URL on Vercel for that deployment environment and redeploy. |
| API unavailable on first visit | Render Free sleeps after inactivity; open `/api/health`, wait about a minute, then retry. |
| App stays on a loading screen | Check browser console, Vercel build/runtime logs and API_URL. A normal API error should show a retry message. |
| Seeded accounts do not exist | Check SEED_DEMO was true on the first seed and DEMO_PASSWORD was 10+ characters. Open Render logs. |
| Demo password change has no effect | The seed is idempotent. It does not reset existing accounts. Use the original password or register a fresh account. |
| No real-time changes across windows | Click the workspace refresh icon or reload; this MVP refreshes after actions rather than subscribing to live updates. |
| QR opens sign-in | Sign in as an officer; the QR URL is preserved and the check-in dialog appears afterward. |
| Officer cannot check in someone | They must be an officer/president of the same club as the event. |
| Free quota exhausted | Check Firestore usage, Render and Vercel limits. Reduce usage or wait for quota reset; upgrading is optional. |

## 8. Cost and scope

Firestore has a free quota; keep Firebase on Spark if you want no automatic paid overages. Render Free sleeps after 15 minutes without traffic and can take about a minute to wake up. Vercel Hobby has usage and eligibility restrictions. This is a small student demo; free tiers are not a promise of unlimited or permanent free production hosting.

No SQL migration is needed: collections are created when the API writes records. All queries use single-field equality and sort in memory, so no custom composite indexes are required.

## Official references

- Firebase server SDK setup: https://firebase.google.com/docs/admin/setup
- Firestore free quotas: https://firebase.google.com/docs/firestore/quotas
- Firestore transactions: https://firebase.google.com/docs/firestore/manage-data/transactions
- Render Express: https://render.com/docs/deploy-node-express-app
- Render Free limits: https://render.com/docs/free
- Vercel project configuration: https://vercel.com/docs/deployments/configure-a-build
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Next.js environment variables: https://nextjs.org/docs/app/guides/environment-variables
