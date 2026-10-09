# Evter implementation plan and product checklist

Status: approved by the user on 2026-10-09 ("Yes, execute"). S0–S3 verified; S4 is next.
Date: 2026-10-09.

## Approval and execution contract

The user explicitly approved this plan, including defaults D1–D11, on 2026-10-09. [Product requirements](PRODUCT_REQUIREMENTS.md), [user flows](USER_FLOWS.md), [architecture](ARCHITECTURE.md), and [data model](DATA_MODEL.md) define the authorized scope.

After approval, implement one slice at a time in dependency order. Each slice ends with recorded evidence against its acceptance criteria. A checkbox is checked only after verification, never because a screen renders or a migration file exists. Report remaining limitations and stop for decisions that materially change scope. Dependency additions, architecture changes outside this design, and public deployment require their own applicable approval; no external APIs are part of the approved MVP proposal.

Checked items have verification evidence below. Unchecked items remain outstanding. During discovery, `updateTrip` and `getTripById` were missing despite existing imports; S0 restored them before collaboration was added.

## Verification used by every slice

`V` means run the repository-required commands after the slice:

```bash
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

`U` means the proposed unit/action tests using installed Bun, without a new package:

```bash
bun test tests/unit
```

`I` means proposed integration tests against a separately configured, isolated Neon test branch:

```bash
bun test tests/integration
```

The test directories were established in S0 and verified against the installed Bun runtime, framework boundaries and Prisma client. Keep framework/auth mocks in unit tests only. Real Prisma integration tests must refuse to run unless an explicit test-environment guard and isolated connection configuration are present; never infer safety from an environment name alone.

`M` means schema checks and migration verification when a slice changes data structures:

```bash
npx prisma validate
npx prisma generate
npx prisma migrate status
```

Create/review incremental Prisma migrations on the isolated development branch; apply the reviewed migration with `prisma migrate deploy` to a disposable test branch containing fixtures and assert backfill results. Commands that apply migrations require verified test connection context; do not run them on the shared database by default. Do not edit generated Prisma files manually. Generated-client/schema changes precede `V`.

`B` means a recorded browser walkthrough of the slice with real Clerk test sessions and persisted database records, including reload and a second authorized/unauthorized account. Browser tooling already available may be used; no browser test package is assumed. Automating a repeatable suite with a new dependency needs approval. `U`, `I`, and `B` are not interchangeable: a mocked action test does not prove persistence or session authorization.

For each slice record: files/migrations changed, scenario and test users, commands with exit status, acceptance outcomes, and unresolved limitations. Do not log credentials, invitation tokens or contact values. Baseline failures are investigated and documented, not silently called passing.

## MVP vertical slices

### S0 — Restore authorized trip editing and establish the test baseline

- [x] **Story and acceptance:** As an organizer, I can open my existing trip, edit its five current fields, save, reload, and see the changes. Another user cannot read or update it by changing the URL/action payload. Missing trips show the existing not-found state.
- [x] **Database:** No schema change; reuse `Trip.organizerId` and the Prisma singleton.
- [x] **Server/auth:** Restore `getTripById` and `updateTrip`, authenticating with Clerk and scoping both to the organizer. Whitelist editable fields, ignore client ownership values, and revalidate the affected routes.
- [x] **Frontend/reuse:** Reuse edit route/form, card link, create/update Zod schemas, pending/error UI, UTC date conversion, and shadcn components. Preserve failed-submission input.
- [x] **Validation/errors:** Invalid identifiers, whitespace, invalid/reversed dates, oversize descriptions, signed-out requests, nonexistent/foreign IDs, and database failure return appropriate states.
- [x] **Tests/commands:** `V`, establish `U`/`I`, and `B`. Cover successful persisted update/clear description, direct unauthorized action calls, and create/list regression. Fix only relevant baseline errors; report unrelated failures rather than expanding scope silently.
- **Dependencies:** None. This restores a broken baseline before collaboration is added.

### S1 — Create and view an owned draft or confirmed event

- [x] **Story and acceptance:** A signed-in user creates an event with dates/destination undecided or already confirmed, sees it in their list, opens its overview, and edits permitted metadata. Ownership and active admin membership always agree.
- [x] **Database:** Add nullable confirmed fields, planning state, version, minimal UserProfile and EventMember. Backfill owner memberships and preserve existing confirmed trips. Time zone remains unset for legacy trips until chosen. Poll rounds arrive in S5/S6; migrate existing events into those rounds then.
- [x] **Server/auth:** Central server-only membership/admin/owner guards; atomic event/profile/membership creation. List/query scopes move from owner-only to active membership. Finalized date/destination changes cannot bypass the later reopening workflow.
- [x] **Frontend/reuse:** Extend existing create/edit forms; build a real event overview and minimal event switcher. Require a display name on onboarding without forcing contact collection. Expose only sections implemented so far.
- [x] **Validation/errors:** Separate draft/confirmed schemas; complete date pair, valid time zone when confirming, safe limits, stale-edit conflicts, authorization and database errors.
- [x] **Tests/commands:** `M`, `U`, `I`, `V`, `B`; legacy backfill, atomic rollback, two-event access isolation, draft/confirmed creation, existing trip URL compatibility.
- **Dependencies:** S0. Actual joining is S2, so initial membership fixtures test shared authorization here.

### S2 — Invite people with revocable links

- [x] **Story and acceptance:** Admin creates/copies a link; recipient signs in and joins as member; list/overview access works after reload. Revoked/expired links fail and repeated joins do not duplicate membership.
- [x] **Database:** EventInvitation, token-hash uniqueness, expiry/revocation timestamps and creator association.
- [x] **Server/auth:** Admin-only issue/revoke; public minimal preview; authenticated explicit join transaction. Recheck event state/token and removed-member restrictions, including concurrent revocation. No role accepted from request input.
- [x] **Frontend/reuse:** Invitation controls in People/Admin; token landing page; safe Clerk return path; explicit join and display-name onboarding. Success links into the event.
- [x] **Validation/errors:** Expired, invalid, revoked, archived, already-joined and removed-member paths; token secrets excluded from logs/client datasets except one-time issuance. Lost raw links can be replaced.
- [x] **Tests/commands:** `M`, `U`, `I`, `V`, `B`; concurrent duplicate joins/revocation, outsider attempts to issue/revoke, self-escalation payloads, signed-out return, and real persistence.
- **Dependencies:** S1.

### S3 — Manage event roles and membership

- [x] **Story and acceptance:** Owner appoints/demotes an admin. Admin removes/restores ordinary members. Members/co-admins can leave. The owner cannot leave or be removed. Removed/left members lose server access immediately on subsequent requests.
- [x] **Database:** Complete membership status, revision, endedAt and event-specific relationship/title fields if not yet added. Preserve historical authorship.
- [x] **Server/auth:** Apply the permission matrix transactionally; owner-only admin changes; no cross-event targets. Increment membership revisions so later responses can exclude inactive memberships.
- [x] **Frontend/reuse:** Real People list with role badges and permitted management controls; confirmation for removal/leave; error feedback on stale role changes. Member edits their relationship/title.
- [x] **Validation/errors:** Prevent last-owner loss, self-escalation, admin removal of another admin, invalid states, and treating wedding-party titles as permissions.
- [x] **Tests/commands:** `M` if schema changes, `U`, `I`, `V`, `B`; owner/admin/member/outsider matrix, removal in an already-open tab, rejoin rules, and preservation of historical rows.
- **Dependencies:** S2.

### S4 — Maintain a private member directory and optional contacts

- [ ] **Story and acceptance:** Users edit their own name/hometown/bio/contact information and choose contact sharing independently per event. Another member sees only permitted fields; outsiders and unshared contacts remain inaccessible.
- [ ] **Database:** Profile fields and encrypted contact envelopes; membership shareEmail/sharePhone flags default false. No bulk copy of Clerk contacts.
- [ ] **Server/auth:** Self-only profile mutation; directory query through shared active membership. Authorize before decrypting. Implement versioned authenticated encryption using existing Node crypto and fail explicitly if key configuration is unavailable.
- [ ] **Frontend/reuse:** Profile settings form, event-specific sharing controls and directory cards; existing Clerk UserButton remains account settings. Optional means blank fields are accepted and can be cleared.
- [ ] **Validation/errors:** Name/text limits, email/phone validation without verification claims, ciphertext tampering, missing key and failed-save retention. Do not expose internal error details or plaintext in logs.
- [ ] **Tests/commands:** `M`, `U`, `I`, `V`, `B`; encrypted-at-rest inspection with synthetic data, wrong-key/tampering rejection, per-event opt-in isolation, contact clearing and member removal. Document key setup/recovery/rotation before deployment.
- **Dependencies:** S3. Contact sharing cannot ship before encryption/authorization verification.

### S5 — Propose date ranges and collect private availability

- [ ] **Story and acceptance:** Admin offers complete ranges; members persist available/unavailable/maybe or clear their own response. Admin sees accurate individual/totals/unanswered results; members see only their own responses.
- [ ] **Database:** PlanningRound, DateOption and DateResponse; current-round uniqueness, option/member/revision uniqueness. Backfill round state from existing draft/confirmed events; leave destination selections for S6.
- [ ] **Server/auth:** Admin option management; member response upsert/clear; separate member/admin query projections. No writes to closed rounds/archived options. Replace options with existing responses instead of changing their meaning.
- [ ] **Frontend/reuse:** Planning date-range form/list and three-way response controls; private admin response matrix. Empty/loading/error states; no destination/finalization controls until their slices are functional.
- [ ] **Validation/errors:** Real dates, ordering, duplicates, same-event/round membership, stale options and conflicts. Missing response is not maybe/unavailable.
- [ ] **Tests/commands:** `M`, `U`, `I`, `V`, `B`; response privacy at payload level, two-event substitution, changing/clearing responses, immutability after voting, removed/rejoined member totals, concurrent upserts.
- **Dependencies:** S3 (S4 can precede it in the default sequence but is not a technical dependency).

### S6 — Propose destinations and collect private votes

- [ ] **Story and acceptance:** Admin offers destinations; members persist independent thumbs-up/down votes and can change/clear them. Admin sees private results. Several options may receive an up vote from one member.
- [ ] **Database:** DestinationOption and DestinationVote; normalized option uniqueness and member-revision response uniqueness. Complete closed-round selected options for legacy confirmed trips.
- [ ] **Server/auth:** Reuse planning-round authorization and privacy projections from S5, without coupling destination votes to date responses.
- [ ] **Frontend/reuse:** Destination option controls alongside date options; own votes for members and separate admin results.
- [ ] **Validation/errors:** Blank/duplicate labels, text limits, invalid enums, cross-round IDs, archived option/stale round, and database errors.
- [ ] **Tests/commands:** `M`, `U`, `I`, `V`, `B`; vote privacy, change/clear, independent ballots, active-member counting, legacy selected-value backfill and foreign-option rejection.
- **Dependencies:** S5.

### S7 — Finalize and reopen event planning

- [ ] **Story and acceptance:** Any admin selects one current date range/destination and finalizes without consensus. Members see confirmed values. Reopening creates fresh responses while preserving history and labeling prior values provisional.
- [ ] **Database:** Finalizer/selection references and lifecycle fields; constraints for complete confirmed values and one open round. Add only missing fields from the conceptual model.
- [ ] **Server/auth:** Transactional finalization/reopening, current version/state checks, same-round active selections, copied eligible options without copied responses. Preserve privacy in history queries.
- [ ] **Frontend/reuse:** Admin review/confirm/reopen actions; prominent confirmed/provisional state on overview; archived round selector respecting role privacy. Existing edit form directs date/destination changes through this flow.
- [ ] **Validation/errors:** Known time zone, complete selection, closed/foreign options, repeated finalization, concurrent admin decisions, bounded transaction retry/conflict message.
- [ ] **Tests/commands:** `M`, `U`, `I`, `V`, `B`; concurrent finalization, no-quorum decisions, atomic rollback, copied options/fresh votes, historic visibility. Reopening's itinerary effects are added and retested when S11/S12 introduce a schedule.
- **Dependencies:** S6.

### S8 — Suggest and moderate activities

- [ ] **Story and acceptance:** Members create real activity suggestions; authors edit/withdraw unscheduled suggestions; admins moderate. Suggestions persist across reload and remain scoped to their event.
- [ ] **Database:** Activity with SUGGESTION/MANUAL kind, authored content, withdrawal and version fields. Only suggestion creation is exposed here.
- [ ] **Server/auth:** Active-member create/read; author or admin edit/withdraw; prevent cross-event references. Future scheduled edits must honor itinerary publication state when S11/S12 add it.
- [ ] **Frontend/reuse:** Reuse form patterns and shadcn cards; activities list, create/edit forms, empty state and withdrawal confirmation. No cost or booking placeholders.
- [ ] **Validation/errors:** Trimmed title, bounded description/location, optional HTTP(S) URL, stale changes, unauthorized edits and failed saves.
- [ ] **Tests/commands:** `M`, `U`, `I`, `V`, `B`; author/admin distinctions, two-event access, persistence, URL validation and withdrawal behavior.
- **Dependencies:** S3; runs after S7 in the default sequence.

### S9 — Vote on activity suggestions

- [ ] **Story and acceptance:** Members up/down vote, change or clear their vote, and see accurate group totals without viewing other members' individual ballots.
- [ ] **Database:** ActivityVote with activity/member/revision uniqueness.
- [ ] **Server/auth:** Current-member upsert/clear, active suggestion check, safe aggregate projection and active-revision filtering. Manual items reject voting.
- [ ] **Frontend/reuse:** Functional vote controls with pending/error state and own selection; totals refresh after successful persistence.
- [ ] **Validation/errors:** Invalid enum/target, withdrawn/manual activity, stale membership, duplicate submission and database failure.
- [ ] **Tests/commands:** `M`, `U`, `I`, `V`, `B`; concurrent votes, role/privacy checks, tally accuracy after removal/rejoin, and persistence after reload.
- **Dependencies:** S8.

### S10 — Manage activity participation separately from votes

- [ ] **Story and acceptance:** Member opts in/out/undecided and optionally gives an opt-out reason. Voting never changes participation. Members see attendance statuses; only author/admins see reasons.
- [ ] **Database:** ActivityParticipation with member-revision uniqueness, status and optional reason.
- [ ] **Server/auth:** Self-only response mutation and authorization-aware read projection; active-member filtering; clear reason when switching to IN or undecided.
- [ ] **Frontend/reuse:** Attendance controls and participants list on activities, ready for reuse on manual itinerary items. No payment promises or inferred reservations.
- [ ] **Validation/errors:** Reason length, invalid statuses, withdrawn activities, foreign member IDs, unavailable resource and failed saves.
- [ ] **Tests/commands:** `M`, `U`, `I`, `V`, `B`; independent votes/attendance, reason privacy, clearing, membership revisions and repeat submissions.
- **Dependencies:** S9 (S8 supplies the essential model).

### S11 — Build an admin-only draft itinerary

- [ ] **Story and acceptance:** Admin schedules a suggestion or creates a manual dinner/pickup; sees a day-grouped draft and can reschedule/remove entries. Members cannot fetch draft manual items/schedule details.
- [ ] **Database:** ItineraryEntry, unique activity scheduling, event publication field and entry review/version fields. Manual entries create an Activity and schedule atomically.
- [ ] **Server/auth:** Admin-only draft writes/read projections; require finalized event/zone, same-event targets and version checks. Reopening retains entries, flags review and withdraws publication. Unscheduled suggestions preserve votes/participation.
- [ ] **Frontend/reuse:** Schedule forms, chronological agenda, manual-item form, overlap warning and time-zone label. Reuse ActivityParticipation. Members see a truthful unpublished state until S12.
- [ ] **Validation/errors:** Event-local boundaries, positive duration, DST gap/ambiguity handling, duplicate schedule, changed event dates, invalid URLs/text and transactional failure.
- [ ] **Tests/commands:** `M`, `U`, `I`, `V`, `B`; UTC/local round-trips across DST, multiple browser zones, duplicates/concurrent scheduling, privacy of manual drafts, remove/re-add without duplicate participation and reopening review flags.
- **Dependencies:** S7 and S10. A time-zone dependency, if necessary, needs separate approval before installation.

### S12 — Publish and view the group itinerary

- [ ] **Story and acceptance:** Admin publishes a reviewed nonempty itinerary; members see the real agenda and change their own participation. Withdrawal/reopening removes the published view immediately on fresh requests. Republish restores the reviewed plan.
- [ ] **Database:** Reuse publication timestamp and entry review state; no separate revision/snapshot tables in the MVP.
- [ ] **Server/auth:** Atomic publish validation; member queries return only published/manual content. Published schedule/content edits require explicit withdrawal. Participation changes stay allowed and do not withdraw the schedule.
- [ ] **Frontend/reuse:** Publish/withdraw confirmations; member agenda, own attendance and participant lists; explicit unpublished/reopened messages; overview shows actual itinerary status.
- [ ] **Validation/errors:** Empty agenda, needsReview, out-of-range entries, event still planning, archived state, stale versions and simultaneous publish/edit attempts.
- [ ] **Tests/commands:** `U`, `I`, `V`, `B`; owner/admin/member/outsider views, published manual participation, publish/edit race, full reopen/refinalize/review/republish cycle and fresh-session persistence.
- **Dependencies:** S11.

### S13 — Revisit past events and archive/restore safely

- [ ] **Story and acceptance:** Active members can switch among past/current events and view an archived event read-only. Owner archives/restores; others cannot. Removed people have no history access.
- [ ] **Database:** archivedAt if not already added; do not destroy event data or reset expired/revoked invitations.
- [ ] **Server/auth:** Apply archive write-denial consistently to every action; owner-only restore. Directory reads continue respecting current membership/contact sharing. Dashboard summaries never expose private poll totals to members.
- [ ] **Frontend/reuse:** Event switcher/history, real summary cards and actionable empty states, owner archive/restore confirmation. Refine responsive warm-earth-tone styling using existing components; no future-feature tabs.
- [ ] **Validation/errors:** Archive/restore races, archived join/save attempts, stale role changes and empty history.
- [ ] **Tests/commands:** `M` if needed, `U`, `I`, `V`, `B`; archive guards across features, restoration behavior, past-event access, stale tabs, responsive navigation and no misleading controls.
- **Dependencies:** S12 and S4.

## Release acceptance gate

- [ ] Execute the complete scenario in [user flows](USER_FLOWS.md) with multiple real Clerk sessions and two isolated events; reload and confirm persisted results.
- [ ] Exercise direct query/action attempts across events, role changes, removed/left membership, archived state, invitation revocation and private-response/contact projections.
- [ ] Verify new and legacy migrations on an isolated branch; record actual migration status and preservation of existing records.
- [ ] Run `U`, `I`, `V` and browser regression covering existing create/list/edit/sign-in flows. Record failures, warnings and unverified paths explicitly.
- [ ] Verify accessible labels, keyboard controls, responsive layouts, error/pending/empty/success states, safe logs and no fabricated dashboard values.
- [ ] Update README with local setup, key configuration, migrations, test environment guards, test commands and known limitations.
- [ ] Review a separate deployment checklist before any public release: actual Clerk production configuration, authorization evidence, secret/encryption-key handling, backup/recovery, applicable retention/account deletion requirements, and operational limits. Passing a build alone is not public-release approval.

## Full-product future-state checklist

Every area in the overview is represented below or in the MVP slices. These boxes preserve product intent; they are not part of MVP implementation approval. Named services are research candidates from the overview, not verified integration commitments.

### F1 — Onboarding, identity and administration

- [ ] Expand simple create/join flows into the complete “Start the party” setup wizard.
- [ ] Invite known platform users through an authorized user-discovery workflow.
- [ ] Target invitations to verified email/phone identities; automated email/SMS delivery, delivery failure/retry and reminders.
- [ ] Allow admins to prefill invitee introductions while giving invitees control over their published details.
- [ ] Add event theme and richer honoree/wedding-party personalization beyond MVP relationship/title fields.
- [ ] Add ownership transfer and richer lifecycle/retention/account-deletion controls.
- [ ] Build internal super-admin support tools with explicitly scoped elevated access and audit records; do not grant silent universal access by default.
- [ ] Evaluate ABAC once real permission needs outgrow event RBAC; map existing roles to attributes without changing access unexpectedly.

### F2 — Destination discovery and richer polling

- [ ] Preferences/budget questionnaire to inform destination recommendations.
- [ ] Historical-weather insights and packing/location pros/cons.
- [ ] Group-size and accessibility suitability; local recommendations informed by user reviews/history.
- [ ] Rich calendar selection and comparison UI beyond the MVP date-range controls.
- [ ] Optional decision reminders/notifications and richer planning history; keep admin final authority explicit.

### F3 — Travel and carpooling

- [ ] Manual flight/train/driving records showing who arrives/departs when, with external tracking links.
- [ ] Shared airport transfers and city-to-city carpool coordination.
- [ ] Research SerpApi/Google Flights search and parse.bot train data, including availability, licensing, pricing and privacy before selecting a provider.
- [ ] Research AviationStack flight tracking and change alerts.

### F4 — Accommodation

- [ ] Shared lodging details: address/reference, bedrooms, bathrooms, amenities such as pool, distance from city and arrival/check-in notes.
- [ ] Per-person amount owed linked to the later expense model.
- [ ] Accommodation suggestions, comparisons and voting.

### F5 — Supplies

- [ ] Shared food, decoration, equipment and miscellaneous supply checklist.
- [ ] Admin assignment to members; assignment/bring status and unassigned items.
- [ ] Link required supplies to activities and planned meals.
- [ ] Weather-based clothing/packing suggestions.
- [ ] Explore clearly identified sponsored recommendations and monetization.

### F6 — Activities and richer itinerary

- [ ] Group-preference-based activity discovery and comparison.
- [ ] Activity/event cost estimates and participant pricing calculator, with explicit allocation rules.
- [ ] Booking/reservation references and confirmation state distinct from a planned itinerary entry.
- [ ] Research TripAdvisor experiences and recreation integrations such as IKON; validate API existence/access/terms before committing.
- [ ] Booking integrations only after approval and transaction/confirmation design.
- [ ] Rich shared calendar, external calendar export/sync and reminders.
- [ ] Multiple occurrences of an activity, parallel draft/published itinerary versions and richer change history if needed.

### F7 — Dinner and meal planning

- [ ] Dedicated breakfast/brunch/lunch/dinner suggestions and comparisons by cuisine/price.
- [ ] At-home meals versus restaurant plans, linked to supplies and shared calendar.
- [ ] Research DoorDash ordering and OpenTable reservations; add only after workflow/payment implications are approved.
- [ ] Keep simple manual meal entries supported by the MVP itinerary while these richer workflows remain deferred.

### F8 — Budget, expenses and payments

- [ ] Admin-only budget showing all planned/actual costs across categories.
- [ ] Explicit cost records related to activities, dining, supplies, accommodations and later categories with referential integrity.
- [ ] Assign a payer for the total event or selected expenses.
- [ ] Define allocation rules, currencies, rounding, honoree treatment, opt-outs, refunds and reimbursements before implementation.
- [ ] Admin view of who owes/paid what; soft due dates and audited paid/unpaid overrides.
- [ ] Member-only personal cost breakdown, payment status and due dates with clear visibility rules.
- [ ] Manual recording of payments completed through external services.
- [ ] Research Venmo, PayPal and Zelle availability/terms; in-app payments require separately approved financial and reconciliation workflows.

### F9 — Navigation, profiles and presentation

- [ ] Extend the shared overview with actual travel, lodging, supplies, meals, expenses and budget summaries as those modules ship.
- [ ] Add the overview's complete tab set only when each tab has real behavior; Budget and Event Admin remain role-restricted.
- [ ] Richer personal settings, introductions and past-event connections with explicit privacy controls.
- [ ] Refine Evter branding: warm wood/earth palette, comfortable high-end salon feel, modern typography with a restrained classic accent.
- [ ] Advanced accessibility/usability review and broader device coverage beyond the MVP responsive baseline.

### F10 — Platform evolution and operations

- [ ] Plan and approve Vercel deployment while retaining the existing Neon database/provider choice.
- [ ] Native mobile application when demonstrated usage justifies it.
- [ ] Separate API/backend only when another client or operational need requires it; keep the MVP full-stack Next.js app.
- [ ] Expanded monitoring, operational support/audit tooling and abuse controls appropriate to actual public usage.
- [ ] More mature key rotation, data retention/export/erasure and recovery workflows; do not defer encryption of any contacts shipped in the MVP.
- [ ] Evaluate integrations individually for necessity, permissions, cost and failure handling. No placeholders claiming provider functionality.

## Overview coverage map

| Original overview area | MVP coverage | Future coverage |
| --- | --- | --- |
| Stack, hosting, mobile, separate backend | Existing stack preserved; architecture document | F10; Supabase superseded by user instruction |
| Member/admin/super-admin; RBAC/ABAC | S1–S3 and permission matrix | F1 |
| Start-the-party wizard, invites, roles, theme | S1–S3; links and descriptive titles | F1 |
| Destination options, questionnaire, weather, reviews | S5–S7 | F2 |
| Date responses, destination votes, admin results/finalization | S5–S7 | F2 richer UI |
| Member details, contact privacy/encryption, settings | S3–S4 | F1/F9/F10 extensions |
| Event switcher, past events, Evter dashboard and tabs | S1 and S13 with real feature summaries | F9 as modules ship |
| Travel and carpooling | Manual pickup itinerary entries only | F3 |
| Accommodation details/options/amount owed | None | F4/F8 |
| Supplies, assignments, weather/sponsors | None | F5 |
| Activities, votes, opt-outs, bookings, pricing, calendar | S8–S12: manual suggestions/plans, votes and participation | F6/F8 |
| Dining, ordering, reservations and calendar | Manual meal itinerary entries | F7 |
| Admin sensitive-data/role controls | S3–S4, admin planning projections | F1/F10 operational tooling |
| Budget, payer assignments, due dates, overrides | None | F8 |
| Member expenses, external/in-app payments, cost relations | None | F8 |
| Warm, comfortable, refined visual direction | Existing Tailwind/shadcn, modest S13 refinement | F9 |

## Plan-review defaults worth checking

No additional interview answer is required to produce this plan, but these product defaults are explicitly proposed rather than silently treated as confirmed:

- Invite expiry is 7 days; removed members need admin restoration, while voluntary leavers may rejoin.
- Event deletion means reversible archive; ownership transfer is deferred.
- Reopening starts a new poll round and resets responses; old selections become provisional.
- Activity totals are shared, individual ballots are private, and opt-out explanations are author/admin-only.
- Published itinerary edits withdraw the schedule until republishing; no simultaneous draft/live versions.
- Contact sharing defaults off per event, with encrypted application storage.

Approval received on 2026-10-09. Execute the slices in order and retain verification evidence below; public deployment and unplanned dependency additions remain outside this approval.


## Execution evidence

### S0 — verified 2026-10-09

- Restored authenticated `updateTrip` and `getTripById`. Server-only persistence helpers apply organizer identity in the read/write predicate; no schema change.
- Reused the existing edit form and validation. Added missing Suspense boundaries around existing Clerk header/sign-in/sign-up UI after the production build identified them.
- `bun test tests/unit`: 13 passed, 0 failed (44 assertions). Framework/auth boundaries mocked only in this suite.
- `bun test tests/integration`: 3 passed, 0 failed (14 assertions), using actual Prisma/PostgreSQL on isolated branch `dev-evter-mvp` (`br-long-cell-b4zyi389`). Verified every edited field, null description, owner preservation, denied foreign read/write and missing-record behavior. Synthetic integration fixtures cleaned up.
- `npx tsc --noEmit`: passed. `npm run build`: passed after Clerk loading-boundary fixes. `npm run lint`: passed with two pre-existing unused-import warnings in `app/page.tsx` and `proxy.ts`. `git diff --check`: passed.
- Browser: two synthetic Clerk development users. Owner created a trip, edited name/destination, received a reversed-date validation error with inputs preserved, corrected dates, cleared description, and verified persisted results after reload. Signed-out fresh request redirected to Clerk; second user's direct edit URL showed Trip not found and their list excluded the owner's trip.
- Isolated test-only configuration is in ignored `.env.evter-test`; normal `.env` and `.neon` remain unchanged. Branch expires 2026-10-16. Browser fixture and two synthetic Clerk test accounts remain available for subsequent slices. Existing user's dev server was left running; acceptance used port 3005 with the successful build and isolated database.
- Visual evidence: `/private/tmp/evter-s0-edit.jpg` (local temporary artifact).

### S1 — verified 2026-10-09

- Added draft/confirmed creation, minimal profiles, atomic owner/admin membership, membership-scoped reads, central member/admin/owner guards, versioned metadata editing, and an event overview/switcher. Confirmed dates/destination can no longer bypass the approved reopening workflow (S7).
- Applied `20261009210000_event_membership_foundation` only to isolated `dev-evter-mvp`. Snapshot comparison verified the existing trip's fields/timestamps unchanged, confirmed state backfilled, owner profile/membership correct, and legacy time zone left null. Production was not migrated.
- Unit tests: 25 passed (76 assertions). Real database tests: 7 passed (38 assertions), covering draft/confirmed persistence, role/event isolation, inactive memberships, atomic rollback, stale and simultaneous edits, and archived write denial. Initial sandbox network failures were retried with approved access.
- TypeScript, lint (same two existing warnings), build, Prisma validation/generation and isolated migration status passed. `git diff --check` reports only trailing whitespace emitted by Prisma in generated files; generated files were not manually edited.
- Browser: synthetic account created draft and confirmed events, edited metadata, recovered from invalid time zone without losing input, and reloaded persisted values. Second account's seeded ordinary membership enabled overview access but denied edit; an unjoined event stayed unavailable. Existing legacy trip URL remains in its owner's event switcher.
- Browser fixture IDs: draft `cmv1fwb4a0000e0p4gtvrxyxi`, confirmed `cmv1fx6f80002e0p4elotezce`. Evidence: `/private/tmp/evter-s1-confirmed.jpg`. Polls, reopening, invitations and member management are subsequent slices.

### S2 — verified 2026-10-09

- Added hash-only invitation storage, seven-day expiry, admin issuance/revocation, minimal public preview, Clerk return to invitation, and explicit authenticated join as MEMBER. Serializing joins/revocation and retrying conflicts prevents stale acceptance; removed members require restoration and voluntary leavers get a fresh membership revision.
- Applied `20261009220000_event_invitations` to the isolated branch only. Prisma validation/generation/status, TypeScript and build passed. Lint passed with the two existing warnings after moving expiration calculation to the server query. Authored-file diff check passed; generator whitespace limitation remains.
- Unit tests: 28 passed, 88 assertions. Real database integration: 13 passed, 67 assertions. Includes simultaneous duplicate joins, revoke/join race, expiry/archive rejection, no role escalation, cross-event denial, hashed storage and unchanged existing memberships after revocation.
- Browser: owner generated/copied link; signed-out preview exposed only event name; Clerk sign-in returned to explicit Join event; second account joined as member and retained access after reload. Separate link revoked through UI and its landing page became unavailable. Screenshot `/private/tmp/evter-s2-joined.jpg` contains no invitation token.

### S3 — verified 2026-10-09

- Added owner-only admin promotion/demotion, owner/admin removal and restoration according to target role, self-only leaving, owner preservation, and self-managed event relationship/title. Member status transitions preserve historical IDs and increment membership revision; a separate version rejects stale updates. Restoring grants MEMBER and requires a separate owner promotion for admin access.
- Applied `20261009230000_member_details` to the isolated branch only. Prisma validation/generation/status passed. Unit tests: 30 passed, 94 assertions. Real PostgreSQL integration: 20 passed, 98 assertions, including the owner/admin/member/outsider matrix, foreign-event targets, inactive access denial, stale updates, restoration revisions and self-only details.
- Browser: owner saved relationship/title, promoted/demoted another member, removed/restored them, and reloaded persisted state. Ordinary member saw no administrative controls, confirmed leaving, lost list/direct-URL access, then rejoined through a valid invitation. Owner had no leave/demotion control. Evidence: `/private/tmp/evter-s3-members.jpg`.
- TypeScript and lint passed (same two existing warnings). Production build passed; a sandbox-induced Turbopack worker-port failure had persisted in its build cache, so that cache was moved aside and the approved rebuild succeeded. The separate running dev-server cache was preserved. Authored-file diff check passed; Prisma-generated trailing whitespace remains untouched.
- Browser server logs revealed invitation expiry being evaluated during prerender despite authentication. Added explicit `connection()` before the preview, per installed Next.js documentation, and reverified the preview at request time.
- Remaining approved scope is S4–S13: profiles/contact privacy, planning polls and decisions, activities/voting/participation, itinerary publication, history/archive, and release acceptance. No new dependencies or external integrations were added.

### Shared database migration — approved and verified 2026-10-09

- After trip creation failed on Vercel, read-only migration status confirmed the shared database was missing the S1–S3 migrations. The user confirmed Vercel uses that database and explicitly approved applying them.
- Applied `20261009210000_event_membership_foundation`, `20261009220000_event_invitations`, and `20261009230000_member_details` using the supplied unpooled connection as a process-local `DIRECT_URL` override. No environment files or Vercel settings were modified.
- Preflight found zero existing trips. Prisma reported all five repository migrations applied and the schema up to date.
- Ran the actual `createOwnedTrip` persistence helper for a draft and confirmed event, committed both, and reloaded each with its active owner/admin membership. Both passed; removed only the synthetic records belonging to the verification run.
- Initial verification from a temporary directory failed to resolve Bun's `server-only` mock; rerunning the same check from the repository succeeded. Temporary verification script was removed. No application code changed, so TypeScript/lint/build were not rerun for this database-only fix.
- The Vercel browser flow was not independently retested; the user can retry the existing deployment against the updated schema. Configure Vercel `DIRECT_URL` with the unpooled value for future migrations.
