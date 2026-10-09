This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Verification and isolated database tests

The approved MVP scope and slice checklist are in [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md).

Run the suites separately so unit-test module mocks cannot replace the real Prisma client in integration tests:

```bash
bun test tests/unit
bun test tests/integration
npx tsc --noEmit
npm run lint
npm run build
```

Integration tests require the ignored `.env.evter-test` file. Configure it only from a verified child branch in the existing Neon project:

```dotenv
EVTER_TEST_DATABASE_URL=<pooled URL for the isolated branch>
EVTER_TEST_DIRECT_URL=<direct URL for that same branch>
EVTER_TEST_BRANCH_ID=<verified child branch ID>
EVTER_TEST_ENDPOINT=<verified endpoint ID without -pooler>
EVTER_TEST_ALLOW_DATABASE=1
```

The test guard checks both URLs match the declared endpoint and refuses the endpoint used by the normal `.env`. Keep the file private and never commit credentials. Tests create synthetic fixtures and remove only their own records. Missing configuration is a failure, not a silently skipped test.

To run a local server or Prisma command with the isolated database, without replacing the normal environment:

```bash
node scripts/with-test-database.mjs npm run dev -- --port 3005
node scripts/with-test-database.mjs npx prisma migrate status
```

If another dev server already holds the Next.js development lock, leave it running and serve a successful production build for browser verification instead:

```bash
node scripts/with-test-database.mjs npm run start -- --port 3005
```

Clerk development users with `+clerk_test` email addresses are used for browser acceptance checks; application data stays on the isolated branch. Do not use real people's accounts as test fixtures. Recheck branch expiration before reusing the test environment.

## Current implementation checkpoint

S0–S3 are implemented and verified: authorized metadata editing, draft/confirmed events, membership-scoped access, revocable invitation links, and owner/admin/member management. Detailed evidence and remaining MVP work are in the implementation plan. Confirmed date/destination changes use the planned reopening workflow (S7), which has not shipped yet.

New migrations have been applied only to the isolated `dev-evter-mvp` branch. The normal `.env` and shared database are unchanged. Use the test-database wrapper above to preview this checkpoint; running it against the old shared schema requires first reviewing and applying the migrations in that environment. The isolated branch expires on 2026-10-16.

The migration preserves existing trips as confirmed, backfills each owner's active ADMIN membership, and leaves legacy time zones unset. Owners cannot leave or lose ownership. Invitation links expire after seven days and are stored only as hashes; links grant MEMBER access, and revoked links do not remove existing members. Restoration also grants MEMBER access; only an owner can promote them again.
