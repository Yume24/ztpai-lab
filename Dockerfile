FROM node:26-alpine

WORKDIR /app

# Projekt używa pnpm (packageManager w package.json), a Node 25+ nie ma już corepack.
RUN npm install -g pnpm@12.10.0

# Najpierw tylko pliki zależności: przy zmianie kodu ta warstwa jest brana z cache.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY . .

ENV NODE_ENV=production
ENV PATH=/app/node_modules/.bin:$PATH
EXPOSE 8000

# exec zastępuje sh procesem node, więc SIGTERM z docker compose down trafia do aplikacji.
CMD ["sh", "-c", "knex migrate:latest && exec node src/server.js"]
