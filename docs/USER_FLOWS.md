# Evter user flows

Status: approved for implementation on 2026-10-09. Requirements and proposed defaults are defined in [product requirements](PRODUCT_REQUIREMENTS.md).

## 1. Sign in and create an event

1. Visitor signs in/signs up through existing Clerk components.
2. User opens the event list and selects Create event.
3. User supplies an event name, optional description, and display name if their application profile is incomplete.
4. User chooses Start planning or Details already confirmed.
5. Start planning allows destination/dates to remain unknown. Confirmed creation requires destination, start/end dates, and an IANA time zone selected manually without a geocoding API.
6. Server validates, creates the event and owner membership atomically, and opens the event overview. Draft creation also creates the first open planning round; confirmed creation records a closed round with the selected options.
7. Dashboard prompts follow actual state: invite people, add planning options, respond, suggest activities, or view the itinerary.

Errors: missing/invalid inputs remain in the form; signed-out submissions request sign-in; database errors show a retry message and do not produce an orphaned event. Existing confirmed trips retain their current values during migration.

## 2. Invite and join

1. Owner/admin opens People or Event admin and generates a share link.
2. App displays the raw link once, with its expiration and revoke/replace controls. Only a hash is stored; a lost link is replaced rather than recovered.
3. Admin copies and shares it manually. No email or SMS is sent by Evter.
4. Recipient opens the link. A valid invitation shows only the event name and a Join call to action, not participants, votes, contacts, or other private data.
5. Signed-out recipients authenticate through Clerk, return to the invitation, then explicitly join.
6. Server rechecks token, expiration, revocation, event state, and membership in the transaction that joins them. New members receive MEMBER, never a client-selected role.
7. Existing active members go to the event without duplicate rows. Previously left members may rejoin; administratively removed members receive a message to contact an organizer.

Invalid/expired/revoked invitations provide a neutral unavailable message. Archiving the event disables joining. Revoking a link does not eject people already admitted. A concurrent revoke/join is serialized so a revoked token cannot be accepted after revocation commits.

## 3. Manage people and profiles

1. Member opens their profile to edit display name, optional hometown/bio and optional contact details.
2. Within an event, they set relationship to the honoree, wedding-party title, and separate email/phone sharing choices.
3. Directory renders active members and only contact fields explicitly shared with that event. Global profile edits affect authorized directories where those fields are shared.
4. Owner promotes/demotes co-admins. Owner/admin removes/restores ordinary members. Only the owner can demote/remove another admin.
5. A non-owner can leave after confirmation. A removal/leave immediately removes access on subsequent server requests and excludes that person's votes/participation from current totals.
6. Historic contributions remain attached to their authors; membership removal does not cascade-delete suggestions or audit history. Personal contacts stop appearing in that event directory.

Owner cannot remove/demote themselves or leave. Archived events are read-only. Restoring a removed person does not automatically re-add old votes to live totals; their response rows remain historical and they must submit again (see data model membership revisions).

## 4. Propose and respond to planning options

1. Admin opens Planning and adds complete date ranges and destination options for the open round.
2. Members see all active options and their own response for each.
3. Date controls are Available / Unavailable / Maybe / Clear. Destination controls are Thumbs up / Thumbs down / Clear.
4. Each save upserts or clears that member's response and returns the persisted state.
5. Admin dashboard shows counts, unanswered members, and individual responses. Member requests never receive these datasets.
6. Options without responses may be corrected. Once responses exist, admin archives the old option and adds a replacement to avoid silently changing a ballot's meaning.

Empty planning state tells members options have not been proposed yet and gives admins an Add options action. Invalid dates and reversed ranges are rejected on the server. Responses to archived options, old rounds, or finalized events return a refresh/retry message. Admin totals count active membership revisions only.

## 5. Finalize and reopen

1. Admin reviews private planning results and selects one active date range and one destination from the open round.
2. Admin confirms the final selection and event time zone. The UI explains that consensus is informative, not required.
3. Server atomically closes the round, records the decision, and updates the event to FINALIZED with confirmed values.
4. Members see confirmed details; planning responses become read-only.
5. To reconsider, an admin selects Reopen planning and confirms that the itinerary will be withdrawn and participants must respond again.
6. Server creates a new round with copied eligible options and no responses, switches the event to PLANNING, and flags existing itinerary entries for review. Previous confirmed values remain visible as provisional.
7. After another finalization, admins review retained schedule times against the new dates/time zone, repair invalid entries, and explicitly republish.

Concurrent finalizations cannot create competing winners. Stale pages show a conflict and reload current state. A previously shared itinerary link shows the withdrawn-state explanation, not a stale authoritative schedule. Poll history remains admin-only except that members can see their own past responses.

## 6. Suggest, vote, and participate

1. Active member opens Activities and creates a suggestion with title, description, optional location/reference URL.
2. Suggestion appears to the group with vote totals and the viewer's vote.
3. Member sets/changes/clears thumbs up or down. They separately choose Going / Not going / Undecided and may give an optional opt-out explanation.
4. Other members see participation names/statuses; only the author and admins see the explanation.
5. Author edits/withdraws their own unscheduled suggestion; admin can moderate any suggestion. Withdrawal retains records but excludes the suggestion from normal lists and scheduling.

Missing votes and missing participation have distinct meanings. A thumbs-up does not mark Going. Schedules are not bookings and do not imply payment. Duplicate submissions produce a single response. Removed members cannot mutate their old contributions.

## 7. Build and publish an itinerary

1. On a finalized event, admin selects a suggestion and chooses Add to itinerary, entering local start/end times and scheduling notes.
2. Alternatively, admin creates a manual item such as dinner or airport pickup. It shares the same participation behavior without a suggestion-voting step.
3. Admin reviews the chronological, day-grouped draft. End must follow start; entries must fit the event dates. Overlaps show warnings because parallel options can be legitimate.
4. Admin publishes a nonempty itinerary after all entries pass validation and review flags are cleared.
5. Members see the published agenda, location/details, event time zone, and their participation controls.
6. To edit a published schedule, admin explicitly withdraws it first; the group sees an update-pending message until republishing. There is one draft, not simultaneous published/draft versions.
7. Removing a suggested activity from the draft schedule returns it to the suggestion list and preserves votes/participation. Removing a manual item withdraws that item.

Publishing empty, outdated, or invalid schedules fails without exposing partial changes. Unscheduling and adding again cannot duplicate participation. Participation changes do not withdraw the itinerary.

## 8. Navigate, revisit, and archive

1. Event switcher lists only active memberships in nonarchived events, including past events.
2. Evter home returns to the event overview when inside an event; an All events link returns to the full event list. Profile/account controls stay available.
3. Shared overview shows confirmed/provisional plans, own pending responses, activity counts, and itinerary status. Admin-only actions appear separately without exposing private planning counts to members.
4. Owner archives an event after confirmation. It disappears from normal navigation, becomes read-only, and disables invitations.
5. Active members can revisit archived/past events through history and view shared profiles under current sharing preferences. Owner may restore an archived event; revoked/expired invitations remain invalid.

Direct links to unauthorized events return a neutral unavailable/not-found result. Hiding navigation is never the authorization control. Deferred modules have no inert tabs, fake summaries, or pretend booking/payment buttons.

## End-to-end acceptance scenario

Use separate owner, admin, member, and outsider accounts and two isolated events. Create a draft, invite a member, promote a co-admin, collect private planning responses, finalize, suggest/vote/opt out, schedule a suggestion and a manual item, publish, reload, reopen, refinalize, and republish. Verify persistence with fresh sessions, private-response filtering, cross-event denial, removal/revocation, and optional contact sharing. Record actual outcomes in the implementation checklist; this scenario has not been executed during planning.
