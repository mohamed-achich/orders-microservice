# Build Stage
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
COPY tsconfig*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Production Stage
FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 nestapp && \
    adduser -S -u 1001 -G nestapp nestapp

# Only copy what's necessary
COPY --from=build --chown=nestapp:nestapp /app/dist ./dist
COPY --from=build --chown=nestapp:nestapp /app/node_modules ./node_modules
COPY --from=build --chown=nestapp:nestapp /app/package*.json ./
COPY --from=build --chown=nestapp:nestapp /app/src/config ./src/config
COPY --from=build --chown=nestapp:nestapp /app/src/migrations ./src/migrations
COPY --from=build --chown=nestapp:nestapp /app/tsconfig*.json ./

USER nestapp

EXPOSE 5001 5051

CMD ["node", "dist/main"]
