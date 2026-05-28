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
