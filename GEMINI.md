# Project: Soulbot - Twitch Chat Bot

## General Instructions

- After completing any tasks that involved editing any files in the `app` or `server` directories, run `npx nuxt typecheck` to ensure there are no type errors. If everything is succeeds and you are finished with your task, ensure `pnpm run lint:fix` is run to fix any issues and ensure you manually fix any issues that eslint is unable to autofix. Rerun the typecheck and eslint again until no issues are present, do not get stuck in a loop and running of these commands.

## TypeScript & API Type Sharing Guidelines

- **Do Not Manually Duplicate API Types**: When typing API responses in the frontend, do not manually recreate types of database entities or API responses.
- **Leverage Nitro Return Types**: Use TypeScript's utility types to dynamically extract types directly from Nuxt API route handlers, keeping frontend and backend 100% synchronized:
  ```typescript
  export type MyResponse = Awaited<ReturnType<typeof import('~~/server/api/path/to/route.get').default>>
  ```
- **Extend for Frontend-Only State**: If the frontend page or components need additional properties for UI layout/local state (e.g. `parentTriggerPath` or optional `id` for new draft models), define a frontend interface that extends the base Nitro type.
- **Centralize Types**: Keep these types inside the `app/types/` directory to share them cleanly across pages, composables, and component props.

## API Authorization & Security Guidelines

- **Enforce Role-Based Access Control (RBAC)**: All administrative server API route handlers (under `server/api/`) MUST validate the request session and permissions at the very start of the handler execution.
- **Use the `requireUserRole` Helper**: Always call `await requireUserRole(event, role)` at the start of the handler to secure a route.
  - Call with `'caster'` for broadcaster-only settings, OAuth controls, or system modifications.
  - Call with `'moderator'` for standard management endpoints (e.g. commands customizers, user list, manual payouts, aliases, modifying user points).
  - Explicitly document public routes if a route should bypass verification (e.g. leaderboard lookup, public point check).
- **Proactive Boundary Definition**: When creating or modifying API routes:
  1. Determine the correct role restriction level immediately.
  2. If it is not 100% obvious who should have access, the agent MUST ask the user for clarification.
  3. If you make a design assumption about the required role, you MUST explicitly state the assumption and role level in your final response to the user.

## API Design & Pagination Guidelines

- **Implement Native Pagination for Multi-Result Endpoints**: When designing or refactoring backend API routes (under `server/api/`) that are expected to fetch or return a high or unbounded number of database rows (e.g., users, transactions, logs), you MUST implement server-side pagination and filtering.
  - **Standardized Helpers**: Use `parsePaginationParams(event)` from `~~/server/utils/pagination` to extract standardized `page`, `limit`, and `search` query parameters.
  - **Standardized Response Payload**: Return results wrapped inside a standard pagination envelope:
    ```typescript
    return {
    	data: matchingRows,
    	meta: buildPaginationMeta(totalCount, page, limit)
    }
    ```
- **Standardized Composable Usage**: On frontend dashboard pages, leverage the reusable composable `usePagination('/api/path/to/route')` from `~/composables/usePagination` to reactively fetch, bind, search, and paginate lists natively.

## Testing Guidelines

- **Mandatory Test Coverage**: When introducing new bot command modules, subcommands, or server API route endpoints, you MUST write a corresponding test file under the `test/` directory to ensure full coverage of scenarios.
  - **Bot Commands**: Add command integration tests in `test/bot/` (e.g., `test/bot/points.test.ts`). Use the `simulateCommand` helper to assert both bot replies and exact database side-effects.
  - **API Endpoints**: Add endpoint tests in `test/api/` (e.g., `test/api/points.test.ts`). Test the exported Nitro route handlers **directly and in-process** by invoking them with a mocked event object (bypassing slow E2E compile builds). Use the global mocks set up in `test/setup.ts` to manage parameters and validation bodies.
- **Sequential Execution**: Run `pnpm test:run` sequentially to confirm all tests pass cleanly, and execute `npx nuxt typecheck` to verify complete type safety.

## Backend & Bot Coding Standards

- **Twitch Token Access**: Never perform raw database queries to select broadcaster or bot credentials (`twitchTokens`). Always use the cached helper functions `getStreamerToken()`, `getBotToken()`, and `getStreamerChannelName()` imported from `~~/server/utils/twurple`. If you write new tokens, call them with `true` (e.g. `getStreamerToken(true)`) to force-refresh the in-memory cache.
- **Username Cleaning**: Always use the standard `cleanUsername(username)` helper function from `~~/server/bot/core/utils` to standardize user names (removing leading `@` and lowercasing) instead of inline `.replace(...)` or `.toLowerCase()`.
- **Explicit Imports**: Always explicitly import route authorization helpers like `requireUserRole` from `~~/server/utils/auth` instead of relying on Nitro's virtual auto-imports. This keeps IDE indexers and offline type-checkers accurate.
- **Minimal Code Comments**: Avoid verbose step-by-step numbering comments (e.g. `// 1. do this`, `// 2. do that`). Write self-documenting code. Keep comments focused only on explaining non-obvious architecture or complex domain rules.
- **EventSub Parallel Writes**: If an alert handler resolves database variables (such as a user's points balance) inside its template, defer its execution slightly using a brief delay (e.g., `await new Promise(resolve => setTimeout(resolve, 10))`) to allow parallel reward/points write operations from other parallel EventSub listeners to finish settling.


## Unified Frontend Page & Table Layout Standards

To guarantee a clean, predictability-driven, and highly professional layout across all administrative panels, all dashboard and list views MUST strictly conform to the following visual structures:

1. **Page Header Actions (`AppPageHeader`)**:
   - Primary page-level actions (e.g. refresh button, primary "Add" triggers) MUST be placed inside the `<AppPageHeader>`'s default slot (rendered in the upper right corner of the page).
   - Keeps secondary content focused entirely on data inspection.

2. **No Double Headings**:
   - Secondary `<h2>` and `<p>` blocks directly above lists or tables MUST be removed to avoid repeating title contexts and wasting vertical space.

3. **Unified Table Controls**:
   - **Search Input (Left)**: The primary search input box MUST always be left-aligned directly above the table. It must follow standard sizes (`max-w-sm` or `sm:w-64`) with the search icon on the left.
   - **Entry Count / Metadata (Right)**: Summary totals (e.g. `Showing X of Y items`) MUST always be right-aligned directly above the table, styled with `text-xs text-muted-foreground select-none`.
   - Never mix control placements or place primary action buttons in the control row.

4. **Table Pagination Location**:
   - All pagination panels (`<Pagination>`) MUST reside at the **bottom** of the data grid (below the table border box), never at the top.
   - Align entry range counts (e.g. `Showing 1-10 of 100 users`) on the left, and standard Radix control buttons (First, Previous, Next, Last) on the right.
