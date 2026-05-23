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

## Testing Guidelines

- **Mandatory Test Coverage**: When introducing new bot command modules, subcommands, or server API route endpoints, you MUST write a corresponding test file under the `test/` directory to ensure full coverage of scenarios.
  - **Bot Commands**: Add command integration tests in `test/bot/` (e.g., `test/bot/points.test.ts`). Use the `simulateCommand` helper to assert both bot replies and exact database side-effects.
  - **API Endpoints**: Add endpoint tests in `test/api/` (e.g., `test/api/points.test.ts`). Test the exported Nitro route handlers **directly and in-process** by invoking them with a mocked event object (bypassing slow E2E compile builds). Use the global mocks set up in `test/setup.ts` to manage parameters and validation bodies.
- **Sequential Execution**: Run `pnpm test:run` sequentially to confirm all tests pass cleanly, and execute `npx nuxt typecheck` to verify complete type safety.
