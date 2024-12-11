# Build Stage
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# Build the application
RUN npm run build

# Production Stage
FROM node:18-alpine

ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 nestapp && \
    adduser -S -u 1001 -G nestapp nestapp

WORKDIR /app

# Copy all necessary files
COPY --from=build --chown=nestapp:nestapp /app/dist ./dist
COPY --from=build --chown=nestapp:nestapp /app/node_modules ./node_modules
COPY --from=build --chown=nestapp:nestapp /app/package*.json ./

USER nestapp

EXPOSE 5001

CMD ["node", "dist/main"]
