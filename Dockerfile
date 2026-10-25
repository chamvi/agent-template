FROM node:24-trixie-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
# @chamvi/cli declares tsdown as an optional peer, so the lockfile marks the
# build toolchain devOptional and `npm prune --omit=dev` keeps it: remove it.
RUN npx chamvi build && npm prune --omit=dev \
    && rm -rf node_modules/tsdown node_modules/rolldown node_modules/rolldown-plugin-dts \
        node_modules/@rolldown node_modules/@oxc-project node_modules/typescript

FROM ghcr.io/chamvi/node:24@sha256:07e17a3b18e0d22bb5ab36b23ad7dd473b97b27b64580e1997e01484c94300b4
COPY --from=build /app/package.json ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "node_modules/@chamvi/cli/dist/cli.mjs", "start"]
