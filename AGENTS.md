<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

## Project Overview

This is a full-stack bachelor party planning application built for the Casper engineering take-home assessment.

The application allows users to organize trips, propose activities, vote on suggestions, and collaboratively plan an itinerary.

The primary goal is to demonstrate a functional, thoughtfully designed product with meaningful interactions and real application logic.

This is not a static website or UI prototype.

## Technology Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- PostgreSQL hosted on Neon
- Prisma ORM
- Zod for validation
- Next.js Server Actions for mutations

Authentication will be added separately. Do not introduce an authentication provider without approval.

## Architecture

Follow the existing application structure.

- `src/components/` contains reusable React components.
- `src/components/ui/` contains shadcn/ui components.
- `src/features/` contains feature-specific application logic.
- `src/lib/` contains shared utilities and infrastructure.
- `prisma/` contains the database schema and migrations.
- `src/generated/prisma/` contains generated Prisma Client code.

Use the existing App Router directory for pages and layouts. Do not create a second App Router directory.

### Server and Client Components

- Prefer Server Components for data fetching.
- Use Client Components only when client-side interactivity is required.
- Use Server Actions for application mutations.
- Never access Prisma directly from Client Components.
- Keep database credentials and sensitive operations on the server.

## Reference Implementation

The trip creation workflow is the canonical example for future development.

Before implementing new features, examine:

- `src/features/trips/schemas.ts`
- `src/features/trips/actions.ts`
- `src/features/trips/queries.ts`
- `src/components/trips/create-trip-form.tsx`
- `src/components/trips/trip-card.tsx`
- The existing trips routes in the App Router directory

Follow the established patterns for validation, database access, mutations, and UI components.

Do not rewrite existing architecture without a clear technical reason and approval.

## Database Conventions

- Use Prisma for all application database access.
- Store persistent application data in PostgreSQL.
- Define database models in `prisma/schema.prisma`.
- Use Prisma migrations for schema changes.
- Use the existing Prisma Client singleton in `src/lib/prisma.ts`.
- Do not introduce another ORM or database.
- Do not use hardcoded mock data as a replacement for database persistence.
- Do not manually edit generated Prisma Client files.

## Validation and Error Handling

- Validate untrusted input on the server using Zod.
- Place feature-specific schemas in `src/features/<feature>/schemas.ts`.
- Return structured validation errors from Server Actions.
- Display meaningful errors in the UI.
- Handle loading, empty, success, and failure states.
- Do not silently swallow errors.

## UI Conventions

- Prefer existing shadcn/ui components.
- Use Tailwind CSS for styling.
- Keep UI components small and focused.
- Follow the existing component and naming conventions.
- Make layouts responsive.
- Do not introduce new UI libraries without approval.
- Do not create buttons or controls without functional behavior.

## Security

- Never expose database credentials or secrets to the client.
- Never trust client-supplied user IDs or ownership fields.
- Authentication and authorization must be enforced before public deployment.
- Once authentication is implemented, enforce authorization on protected queries and mutations.
- Do not deploy development-only unauthenticated mutations.

## AI Development Workflow

When implementing a feature:

1. Read this file and inspect the relevant existing code.
2. Identify the files that need to change.
3. Briefly explain the implementation approach.
4. Follow existing patterns rather than introducing new architecture.
5. Implement the feature end to end.
6. Include validation, persistence, and error handling where applicable.
7. Run relevant checks and tests.
8. Report what changed, what was tested, and any remaining issues.

Do not make unrelated changes.

Ask for approval before:

- Adding dependencies
- Changing database architecture
- Introducing a new framework
- Performing large refactors
- Removing existing functionality

## Definition of Done

A feature is complete only when:

- Its UI is functional.
- Required data is persisted.
- Inputs are validated.
- Server-side operations work correctly.
- Errors are handled.
- Relevant authorization checks are enforced.
- Loading and empty states are implemented where appropriate.
- TypeScript and build checks pass.
- No unrelated functionality is broken.

Do not claim a feature is complete if it only renders static content.

## Verification

Run the relevant checks after implementing changes:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

If a command fails, investigate and report the failure.

Never claim tests passed unless they were actually executed.

## Project Priorities

Prioritize working functionality over visual polish.

Suggested implementation order:

1. Trip creation and listing (implemented)
2. Trip editing
3. Authentication and trip ownership
4. Activity suggestions
5. Activity voting
6. Itinerary management
7. UI polish and deployment

Do not begin a new major feature without confirming its scope.
