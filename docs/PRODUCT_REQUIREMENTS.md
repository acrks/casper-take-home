# Evter product requirements

Status: approved for implementation by the user on 2026-10-09. Confirmed decisions and defaults D1–D11 are accepted.
Date: 2026-10-09.

## Purpose and sources

Evter helps a bachelor/bachelorette party group agree on where and when to go, contribute activity ideas, and follow a shared itinerary. The MVP must support real collaboration and persistence, not demonstration-only screens.

Sources are the complete `Evter Overview.txt`, the product discovery interview, `AGENTS.md`, and the current repository. Explicit interview decisions override suggestions in the original overview. The overview's Supabase suggestion is superseded by the user's instruction to keep Neon PostgreSQL. Clerk is already implemented; the older authentication-pending sentence in `AGENTS.md` is stale.

This specification does not authorize implementation, new dependencies, deployment, or external integrations. See [implementation plan](IMPLEMENTATION_PLAN.md) for the approval gate and the complete future-state checklist.

## Confirmed decisions

| ID | Decision |
| --- | --- |
| C1 | MVP: events, invitations, date/destination selection, activity suggestions and votes, and a published itinerary. Other planning modules can follow. |
| C2 | Events may start with confirmed dates/destination or as drafts with those details undecided. |
| C3 | Admins propose complete date ranges. Each member responds available, unavailable, or maybe. Destination options receive separate thumbs-up/down votes. |
| C4 | Members see only their own date/destination responses. Owners/admins see individual responses and totals. |
| C5 | Any event admin may finalize dates/destination without unanimity, and may reopen planning with a clear warning that confirmed plans are changing. |
| C6 | Revocable invitation links, manually shared by admins. Recipients authenticate through Clerk before joining. |
| C7 | Creator is owner. Co-admins manage planning and participants. Only the owner appoints/removes admins or deletes the event. |
| C8 | Members may suggest activities and change their own thumbs-up/down votes. Admins select activities for the itinerary. |
| C9 | Activity participation is separate from voting: opt in/out, with an optional explanation. |
| C10 | Only owners/admins schedule and edit itinerary entries. Members view the itinerary and manage their own participation. Admins may add manual entries without an activity vote. |
| C11 | Contact details are optional. Wedding-party titles describe people and do not grant permissions. Super-admin is a future nice-to-have. |
| C12 | Retain Next.js App Router, TypeScript, Tailwind, shadcn/ui, Zod, Server Actions, Prisma, Neon PostgreSQL, and Clerk. No new external APIs for the MVP. |

## Proposed defaults for plan review

These fill smaller workflow gaps; they were not individually decided in the interview. Approving the plan accepts these defaults unless amended.

| ID | Proposed default |
| --- | --- |
| D1 | Invitation links join as MEMBER only, are reusable for 7 days, and may be revoked or replaced. Revocation does not remove existing members. Removed members cannot rejoin until an admin restores them. |
| D2 | A member or co-admin may leave; the owner cannot leave. Co-admins may remove ordinary members; only the owner may demote/remove co-admins. Ownership transfer is future scope. Event deletion is a reversible archive in the MVP. |
| D3 | Planning options are immutable after a response exists: replace/archive an option rather than changing what someone voted on. Clearing a response returns it to unanswered, which is distinct from maybe/down. |
| D4 | Reopening starts a new planning round, copies the previous round's eligible options, and does not copy responses. Previous rounds remain admin-readable. Last confirmed details stay labeled provisional until finalization. |
| D5 | Activity vote totals are visible to members, with their own vote editable. Individual activity ballots are not shown to other members. Participation names/statuses are member-visible; optional opt-out reasons are visible only to the author and admins. |
| D6 | Members can edit/withdraw their own unscheduled suggestions. Admins can moderate all suggestions. Once scheduled, only admins change the item; participation remains self-managed. Manual itinerary entries do not accept votes. |
| D7 | Activities can be suggested and voted on during planning. Scheduling/publishing requires finalized dates/destination and an event time zone. Publishing means plans, not proof of booking. |
| D8 | Itinerary publication is explicit. Members see published entries; admins see drafts. Editing a published schedule first withdraws it, with confirmation. Reopening planning also withdraws it and flags retained entries for review. No parallel draft/published versions in the MVP. |
| D9 | Self-managed basic profiles provide a display name, optional hometown/bio and optional contact details. Event membership holds relationship/title and explicit email/phone sharing choices, default off. No automatic exposure of Clerk email/phone. |
| D10 | Past events remain accessible to active members. Archived events are read-only, excluded from the normal switcher, and accessible in an archive view; the owner can restore them. Removed/left members lose access, including directory access. |
| D11 | No automatic winner, quorum, booking, payment, notification delivery, chat, or real-time synchronization. Server revalidation/navigation provides fresh data. No cost calculator or financial fields in MVP activities. |

## MVP requirements and acceptance outcomes

### Events and membership

- An authenticated person can create a draft using a name and their display name, with an optional description. Confirmed creation additionally requires a destination, complete date range, and time zone.
- Creation assigns ownership and creates active admin membership atomically. A person can participate in multiple events with different roles.
- The event list and switcher show only authorized events, including past events. Existing trip IDs and URLs remain usable; the product calls them events while the model remains `Trip`.
- Owners/admins edit event metadata. Changes to finalized dates/destination go through reopening/finalization, not a bypass in the basic edit form.
- Any authorized member may view the event dashboard and directory. Only owners/admins see event administration and private planning results.
- Invitations persist, survive authentication redirects, and cannot escalate roles. Joining twice cannot create duplicate membership.
- Member removal, leaving, and invitation revocation take effect in server authorization, not just navigation visibility.

### Choosing dates and destination

- Admins manage date ranges and destination options independently within one open round.
- Members save/change/clear one response per option; multiple options can receive favorable responses.
- Only admins receive aggregate or individual planning results. A missing response is shown as unanswered, never inferred as a negative response.
- Finalization selects one active destination option and one active date range from the current round. No automatic majority rule applies.
- Finalization closes voting and records who finalized and when. Repeated or stale submissions cannot override a newer decision silently.
- Reopening explains the consequences, preserves history, resets current-round responses, and requires itinerary review before republishing.

### Activities and itinerary

- Members create suggestions with a title, description, optional location and external reference URL; all persist to the event.
- One changeable thumbs-up/down vote per member per suggestion; voting does not opt someone in, schedule the suggestion, or create a financial obligation.
- Members independently opt in/out or clear their participation; reasons are optional and limited in length.
- Admins schedule a suggestion once, or create a manual item such as dinner or airport pickup. No external booking API is involved.
- Scheduled entries have valid start/end times within the event's local dates. Overlaps are allowed and surfaced as a warning rather than rejected.
- Admins explicitly publish a nonempty, reviewed itinerary. Members see a day-grouped chronological agenda in the event time zone and their participation controls.
- Failed saves retain inputs and show useful feedback. Draft/unpublished, empty, loading, unavailable, and unauthorized states are functional.

### Profiles and privacy

- Users edit only their own global profile and event-specific relationship/title/contact-sharing choices.
- The directory exposes profile information only through an active shared event. There is no global user search or public directory.
- Shared contact fields are optional and individually opt-in per event. Admin status does not expose contacts a person has not shared.
- Optional contact values stored in application PostgreSQL must be encrypted at the application layer, following the overview's requirement. Encryption is part of the contact slice, not deferred while plaintext contacts ship.
- Clerk remains the identity/account system. Profile edits do not change Clerk authentication identifiers.

## Permission matrix

Owner includes all admin/member abilities; admin includes member abilities. Every permission is event-scoped.

| Operation | Owner | Admin | Member | Outsider |
| --- | --- | --- | --- | --- |
| View active event, shared directory, published itinerary | Yes | Yes | Yes | No |
| View/change own planning responses and participation | Yes | Yes | Yes | No |
| View all planning responses and totals | Yes | Yes | No | No |
| Suggest/vote on activities | Yes | Yes | Yes | No |
| Edit metadata/options, finalize/reopen, moderate activities | Yes | Yes | No | No |
| Schedule/withdraw/publish itinerary | Yes | Yes | No | No |
| Issue/revoke invitation links | Yes | Yes | No | No |
| Remove/restore ordinary members | Yes | Yes | No | No |
| Promote/demote/remove co-admins | Yes | No | No | No |
| Archive/restore event | Yes | No | No | No |
| Leave event | No | Self | Self | N/A |
| Edit a profile | Self | Self | Self | Own profile only |

Valid invite holders may see a minimal invitation preview and join after authentication; this grants no event-data access before joining. Archived events allow authorized reads and owner restoration only.

## Scope exclusions and quality bar

Future modules include travel/carpooling, accommodations, supplies, separate dining workflows, budgets/expenses/payments, recommendations, external booking/tracking APIs, mobile apps, ABAC, and internal super-admin tools. The full checklist is in the implementation plan; future navigation must not masquerade as working MVP features.

Use a responsive, accessible interface with warm earth tones and restrained typography consistent with the overview, reusing existing styling. Elaborate branding is future polish. Event overview, planning, people, activities, itinerary, and conditional administration form the MVP navigation.

Each slice requires database persistence, Zod validation, authorization on reads and writes, concurrency-sensitive tests where relevant, useful UI states, and the checks in `AGENTS.md`. Release acceptance includes two events and multiple users demonstrating isolation, not merely a successful build. No implementation or verification is claimed complete by these documents.
