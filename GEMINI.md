# Project: Soulbot - Twitch Chat Bot

## General Instructions

- After completing any tasks that involved editing any files in the `app` or `server` directories, run `npx nuxt typecheck` to ensure there are no type errors.

## TypeScript & API Type Sharing Guidelines

- **Do Not Manually Duplicate API Types**: When typing API responses in the frontend, do not manually recreate types of database entities or API responses.
- **Leverage Nitro Return Types**: Use TypeScript's utility types to dynamically extract types directly from Nuxt API route handlers, keeping frontend and backend 100% synchronized:
  ```typescript
  export type MyResponse = Awaited<ReturnType<typeof import('~~/server/api/path/to/route.get').default>>
  ```
- **Extend for Frontend-Only State**: If the frontend page or components need additional properties for UI layout/local state (e.g. `parentTriggerPath` or optional `id` for new draft models), define a frontend interface that extends the base Nitro type.
- **Centralize Types**: Keep these types inside the `app/types/` directory to share them cleanly across pages, composables, and component props.
