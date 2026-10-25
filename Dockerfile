FROM node:24-trixie-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npx chamvi build && npm prune --omit=dev

FROM ghcr.io/chamvi/node:24@sha256:07e17a3b18e0d22bb5ab36b23ad7dd473b97b27b64580e1997e01484c94300b4
COPY --from=build /app/package.json ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "node_modules/@chamvi/cli/dist/cli.mjs", "start"]
