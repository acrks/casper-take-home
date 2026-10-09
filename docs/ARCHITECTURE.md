# Evter architecture

Status: approved implementation design as of 2026-10-09; execute one verified slice at a time.

## Existing foundation and reuse

| Area | Current repository | Plan |
| --- | --- | --- |
| Routing | Root `app/`, App Router, Next.js 16.4.0; Cache Components and partial prefetching enabled | Extend this router; read installed Next.js guides before implementation |
| Authentication | Clerk provider, sign-in/up routes, `proxy.ts` protects `/trips` | Keep Clerk and add protection for new private routes |
| Trip creation | Authenticated Server Action, Zod input validation, Prisma persistence, server-derived organizer ID | Extend to draft/confirmed creation and atomic owner membership |
| Trip reads | `getTrips()` scopes to `organizerId` | Expand to active membership; shared event guard for all reads |
| Trip editing | Form, route, schema, loading/error/not-found UI exist; `updateTrip` and `getTripById` exports are missing | Restore authorized editing first; do not count it as working today |
| Persistence | `src/lib/prisma.ts` singleton, `PrismaPg`, generated Prisma Client, migrations | Reuse; no new ORM or generated-file edits |
| Connection config | Runtime `DATABASE_URL`; Prisma CLI `DIRECT_URL` | Preserve names; verify isolated target before any future migration |
| UI | Feature components in `src/components`; actual shadcn primitives in root `components/ui` | Preserve existing imports and Tailwind styles |
| Testing | No test suite or test script found; Bun 1.3.13 installed and declared as package manager | Propose Bun's built-in test runner without adding a package; verify framework mocking compatibility in slice S0 |

The latest repository inspection found existing user changes in `AGENTS.md` and `app/page.tsx`. Planning leaves them untouched. Earlier successful checks from another repository state are not evidence that the current baseline builds.

## Application boundaries

Keep one full-stack Next.js app. Server Components fetch through server-only feature queries. Small Client Components own interactive forms, pending state, and navigation; they call Server Actions. Server Actions validate untrusted inputs, authenticate through Clerk, authorize the specific event/resource, then access PostgreSQL through Prisma.

Continue `schemas.ts`, `queries.ts`, and `actions.ts` under `src/features/<feature>/`. Add features as their slices require them: membership/invitations, profiles, planning, activities, and itinerary. Shared authorization belongs in a small server-only event access module; shared date/contact helpers belong in `src/lib`. Avoid a generic repository framework or a separate API service.

Public page properties, Server Action results, and client payloads are explicit view models. Do not serialize complete Prisma records to clients: profiles contain encrypted contacts, invitations contain token hashes, and planning datasets contain private ballots.

## Proposed routes

| Route | Behavior |
| --- | --- |
| `/trips`, `/trips/new`, `/trips/[tripId]/edit` | Preserve existing list/create/edit entry points |
| `/trips/[tripId]` | Shared event overview with role-appropriate calls to action |
| `/trips/[tripId]/planning` | Options and own responses; admin-only result projection |
| `/trips/[tripId]/people` | Authorized directory and role-appropriate invitation/member controls |
| `/trips/[tripId]/activities` | Suggestions, totals, own vote and participation |
| `/trips/[tripId]/itinerary` | Published member view; admin draft management |
| `/trips/[tripId]/admin` | Metadata, lifecycle, invitations, membership administration |
| `/trips/archived` | Read-only history with owner restoration |
| `/profile` | Self-managed application profile; Clerk account controls remain available |
| `/invite/[token]` | Minimal token-validated preview, authentication return path, explicit join action |

Keep `(dashboard)` as a route group, not a second router. Dynamic route `params` are awaited per the installed Next.js guide. Database/auth-dependent route content needs loading/Suspense boundaries under the current configuration. Read the installed error-boundary API before copying older `reset`/`retry` examples.

## Authorization design

- Identity comes exclusively from server-side Clerk `auth()`. Client user IDs, roles, owner flags, and display claims never establish access.
- `Trip.organizerId` is the canonical owner identity. Active `EventMember` rows determine event access and ADMIN/MEMBER roles. Owner must have an active ADMIN row; ownership additionally grants owner-only powers.
- Guards distinguish signed-out, unavailable, member, admin, owner, and archived-state access. Unauthorized resource reads use a neutral not-found/unavailable response to avoid event enumeration.
- Every query/action checks authorization independently of `proxy.ts`. Every nested resource is fetched with its event ID, not just a globally unique child ID.
- Membership checks and resource writes occur in the same transaction for permission-sensitive operations. Recheck before commit through serializable transaction semantics and bounded retry; return a conflict after retries are exhausted.
- Active-member response queries also match membership revision so removing/restoring membership cannot reactivate stale ballots automatically.
- Planning member queries select options and that user's own responses only. Admin totals use a distinct authorized query. UI hiding does not satisfy privacy.
- Archived events allow authorized reads and owner restoration; other writes fail even through direct Server Action requests.

## Validation, errors, and concurrency

Keep Zod validation on the server and structured action results consistent with `createTrip`: success with relevant IDs, field errors for invalid input, and a useful message for operational failure. Add a small error code only when the UI needs to distinguish conflict, session expiry, or unavailable state. Preserve entered values after a failure.

Validate identifiers, trimmed text and length limits, enums, safe HTTP(S) reference URLs, real calendar dates, date ordering, timestamps, and state transitions. Shared editable fields should be reused across create/edit schemas; draft creation must not weaken finalization validation.

Use uniqueness constraints for votes, participation, membership and scheduling; upsert changeable responses. Use transactions for event creation, invite acceptance/revocation, membership changes, finalization/reopening, and itinerary publication. Add integer versions to concurrently edited event/option/activity/schedule records where a stale form could overwrite another admin's work. State/version predicates turn those cases into user-visible conflicts.

Server logs include operation and nonsecret identifiers but exclude contact plaintext, invitation tokens and raw user-submitted reasons. Client messages never include connection details or raw database errors. Unexpected read errors reach local error boundaries; expected missing records reach not-found UI. Loading and empty states are required in each route.

## Date and schedule representation

Keep existing event dates and their noon-UTC conversion during this MVP to preserve current data. Treat them as date-only values in the application, formatting in UTC for date inputs; poll date options use the same convention. Do not reinterpret these values as itinerary instants.

Require an explicit IANA event time zone before confirmed creation, finalization, or scheduling. Schedule entries store UTC instants and display/edit them in the event zone. Validate local date boundaries, including the final day's end, and daylight-saving gaps/ambiguities. Do not guess ambiguous conversions or rely on the browser's zone. Choose an existing-runtime implementation during the schedule slice; if a date-time dependency proves necessary, request approval before adding it.

Legacy trips have unknown time zones; retain their dates and ask an admin to select a zone before scheduling. No geocoding, maps, or location lookup API is required.

## Profile and invitation security

Clerk remains the account system; a local `UserProfile` stores application display information. No webhook or bulk Clerk user synchronization is necessary for the MVP. Owners/members establish their profile as part of authenticated onboarding. Backfilled users may complete their profile on next access.

Optional application-stored email/phone values use authenticated encryption, proposed AES-256-GCM through Node's built-in crypto, random nonces, and versioned ciphertext envelopes. Keep encryption keys in server environment configuration separate from the database. Decrypt only after self-access or event-sharing authorization. Missing keys must fail the contact feature explicitly; never fall back to plaintext. Cover tampering, wrong key, round-trip and visibility in tests. Key backup/rotation and removal procedures are documented before deployment; no external encryption service is required for the exercise.

Invite tokens are cryptographically random, stored as hashes, shown only on issuance, and revalidated on join. Do not log raw links, send them to analytics, or load third-party resources on invite pages that leak token URLs. Use a restrictive referrer policy there. Validate return destinations as internal allowlisted paths. Link expiration/revocation is checked server-side; role is always MEMBER on join.

## Caching and navigation

Do not put private event responses in shared cross-user caches. Start with authorized request-time Prisma reads. Revalidate affected paths after successful mutations, including list/overview, private planning results, activities, people, and itinerary as appropriate. Role changes must refresh server-derived capabilities; stale tabs may display old content but cannot perform unauthorized writes.

Dashboard summaries use real queries and permission-filtered counts. No inactive tabs for future modules. Client state is form/UI state; PostgreSQL is the source of truth for membership, responses, and plans.

## Migration, testing, and deployment boundaries

Use incremental Prisma migrations and preserve existing trips and organizer IDs. Test backfills and constraints on an isolated Neon branch in the same existing project before changing a shared environment. Neon documents this use of branches for isolated migration testing in its [schema-change workflow](https://neon.com/blog/track-schema-changes-automatically-in-your-pull-requests). Keep direct migration and runtime connection configuration separate and verify both point at the intended test environment.

No database branch, migration, deployment, credential change, or environment rewrite is performed during planning. Actual branch setup follows the applicable Neon skill when implementation is authorized. Do not add another project/provider or use production as a test fixture.

Tests separate pure schemas/policies, Server Action behavior with mocked framework boundaries, real Prisma persistence/constraints on isolated PostgreSQL, and browser flows with Clerk test accounts. Mocked persistence is useful for failures but cannot prove the database acceptance criteria. See [implementation plan](IMPLEMENTATION_PLAN.md) for commands and per-slice cases.

The overview proposes Vercel as the eventual app host; deployment is a later gate. Keep the existing Next.js architecture, avoid a forced client-only SPA rewrite, and defer separate backend services, mobile clients, external integrations, and real-time infrastructure.
