FROM node:22-bookworm-slim AS dev

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN npm install -g pnpm@8.14.3

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3000

ENTRYPOINT ["sh", "/app/docker/entrypoint.dev.sh"]
