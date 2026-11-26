# MoneyMgr Admin

The operator console for MoneyMgr: see how the service is used, look after user accounts, and check that
everything is running. Web only (Next.js 16 · React 19 · Tailwind 4 · TanStack Query · typed `openapi-fetch` client).

It talks to the same API as the apps (`mgr_backend`), through the admin routes under `/v1/admin/*`.

## Pages

| Page | What it shows |
|---|---|
| **Overview** | Users (total, verified, new, active, suspended), sign-ups per day for 30 days, record counts and receipt storage. No balances or amounts. |
| **Users** | Search by email or name, filter by status, paged. |
| **User detail** | Profile, record counts, signed-in devices, recent admin activity, actions, and the support view. |
| **Audit log** | Every admin sign-in, action and support-view read, filterable by action and user. |
| **Admins** (owners only) | Add admins with a one-time password (shown once), disable/enable, reset password or authenticator, make owner/regular. Each change needs a reason and is audited. |
| **System health** | Database, Redis, exchange rates, email and receipt storage checks, refreshed every 30 s. |

### Actions on a user
Suspend / reactivate · force sign-out · resend verification / mark verified · delete permanently.
Every action needs a **reason**, which is stored in the audit log. Deleting also needs the user's email typed out.

### Support view
Financial data (accounts, transactions, budgets, notes, investments, receipts…) is hidden by default. To see it,
open a support view on that user: it needs a reason, expires on its own (`ADMIN_SUPPORT_MINUTES`, 30 by default),
and **every tab you open is written to the audit log**. The API enforces all of this; the dashboard can't skip it.

## Security model

- **Separate admin accounts** (not customer accounts): the first owner is created from the command line, later ones by owners on the Admins page; **mandatory 2FA**; a one-time password must be replaced at first sign-in before anything else works
  (an authenticator app, TOTP). The first sign-in shows a QR code to enrol.
- Admin tokens are signed with their own key (`ADMIN_SECRET` on the API) and can't be used on customer routes, or the reverse.
- Sessions last at most `ADMIN_SESSION_HOURS` (12 h by default), whatever the activity.
- Tokens live only in **httpOnly, SameSite=strict cookies** set by this app's server (`mma_*`), never in browser JS.
  The short-lived 2FA token between the password and the code steps is kept the same way.
- 5 wrong passwords lock the admin account for 15 minutes; failed sign-ins and wrong codes are audited.
- Pages send `X-Frame-Options: DENY`, `no-referrer` and `noindex`; API responses are `private, no-store`.
- Deploy it on its own host name, ideally behind a VPN or an IP allow-list.

## Running locally

1. Start the API (`mgr_backend`), with `ADMIN_SECRET` set in `apps/api/.env` (see its `.env.example`).
2. Create an admin (from `mgr_backend`):
   ```bash
   pnpm --filter @moneymgr/api admin create --email you@example.com --name "Your Name"
   ```
   It asks for a password (at least 12 characters), or reads it from `ADMIN_PASSWORD`.
3. Start the dashboard:
   ```bash
   cp .env.example .env.local   # API_URL=http://localhost:8000
   npm install
   npm run dev                  # http://localhost:3001
   ```
4. Sign in. The first time, scan the QR code with an authenticator app and enter its 6-digit code.

Other admin commands (`mgr_backend`): `admin list`, `admin reset-2fa --email …` (lost phone),
`admin disable --email …`, `admin enable --email …`. Each one is written to the audit log.

## Scripts

| Command | |
|---|---|
| `npm run dev` | Dev server on port 3001 |
| `npm test` | Unit and component tests (Vitest) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run build` | Production build |
| `npm run api:sync` | Copy `openapi.json` from `../mgr_backend` and regenerate the typed client |
