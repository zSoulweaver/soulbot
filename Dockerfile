# Stage 1: Build
FROM --platform=$BUILDPLATFORM node:24-alpine AS builder

RUN apk add --no-cache python3 make g++ git \
    && npm install -g pnpm@11

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Inject supportedArchitectures dynamically so the builder stage installs optional dependencies
# for both linux/x64 and linux/arm64 (keeps local developer machines clean)
RUN printf "\nsupportedArchitectures:\n  os:\n    - linux\n  cpu:\n    - x64\n    - arm64\n" >> pnpm-workspace.yaml

RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Stage 2: Production dependencies
FROM node:24-alpine AS prod-deps

RUN apk add --no-cache python3 make g++ git \
    && npm install -g pnpm@11

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Stage 3: Runtime
FROM node:24-alpine AS runner

RUN apk add --no-cache bash

WORKDIR /app

# Copy production node_modules from prod-deps stage and built Nuxt output from builder
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/.output ./.output

# Copy migrations folder for programmatic startup execution
COPY server/database/migrations ./server/database/migrations

EXPOSE 3000

ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", ".output/server/index.mjs"]
