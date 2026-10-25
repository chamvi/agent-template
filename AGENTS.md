<!-- NOTE: Keep this file and the guides in .agents updated as the project evolves. -->

# agent-template: Agent Guide

This is a single-package, self-hosted chamvi agent app. `src/index.ts` default-exports `createApp({ agents: [example], modules })`. The example counts words before summarizing, subscribes to HTTP and a weekly Berlin cron schedule, and uses the dashboard enabled in `src/modules.ts`.

## Quick Reference

```bash
npm ci
cp .env.example .env
npm run dev
npm run build
npm run test
npm run typecheck
npm run lint
```

- **Node.js:** >=22.18.0; `.nvmrc` selects 24.
- **Package manager:** npm, no workspaces or nx.
- **CLI:** installed `@chamvi/cli`, bin `chamvi`.
- **Build:** `chamvi build` to `dist/index.mjs`, dependencies external.
- **Environment:** set a real provider key only in the ignored `.env`; tests never need one. The sample token is local-only.
- **Lockfile:** `package-lock.json` is committed and resolves only from `https://registry.npmjs.org/` (`test/unit/lockfile.spec.ts`); CI and the Dockerfile use `npm ci`.
- **Image and deploy:** `Dockerfile` (two stages, `ghcr.io/chamvi/node:24` by digest), `scripts/image-smoke.sh`, `scripts/image-tags.sh`, Flux examples in `deploy/flux`.

## Working Rules

- Use `@chamvi/app` for the common agent API. Feature APIs and `/module` entries come from their feature packages. Do not import `@chamvi/core` or `orkos` directly.
- Use `channels: [http.on(...), cron.on(...)]`, provider/model strings with `/`, and `runJob({ subscription })`.
- Keep the explicit default-exported app entry synchronous and free of startup I/O. Optional agent folders do not replace it.
- Relative TypeScript imports include `.ts`; no enums, parameter properties or namespaces.
- Tests use the real app and tools with a fake model. No real provider calls in tests.
- Run `npm run lint:fix` before hand-fixing formatting, then build, test, typecheck and lint. Report failures, including dependency failures.
- Never edit generated `dist/`, commit secrets, `.env` or an `.npmrc` with credentials.

## Detailed Guides

- [Structure](.agents/structure.md): entry, agent, modules and test files.
- [Testing](.agents/testing.md): fake model, HTTP and CLI checks, contract checks.
- [Conventions](.agents/conventions.md): TypeScript, tooling and repository hygiene.
- [Deployment](.agents/deployment.md): environment, image, CI, Flux, scheduling and shutdown.

## Commits, Issues & Pull Requests

- Conventional Commits: `feat: ...`, `fix: ...`, `test: ...`, `docs: ...`.
- Do not add AI-attribution trailers, bylines or generated-by text.
- Do not use em dashes in commit messages, issue or pull request titles, bodies or comments.
- No release-please, commitlint or husky is configured in this starter.
