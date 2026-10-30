# Conventions

## Tooling and Style

- Single-package ESM app, Node >=24.3.0, npm.
- TypeScript 6 extends `@tada5hi/tsconfig`; `noEmit`, `allowImportingTsExtensions` and `erasableSyntaxOnly` are enabled. Relative imports include `.ts`. No enum, parameter property or namespace syntax.
- ESLint 10 uses `@tada5hi/eslint-config`; run `npm run lint:fix` before manual formatting changes.
- Four-space indentation, LF, single quotes and semicolons. `.editorconfig` is authoritative for whitespace.
- Starter source files have no copyright header. Keep LICENSE and NOTICE, and review them when adopting the template.
- Use kebab-case agent names and file names. Keep the starter's small agent/entry/module files simple; split growing concepts into folders rather than a catch-all utilities file.

## App Boundaries

- Import the common agent API from `@chamvi/app`; do not add direct `@chamvi/core` or `orkos` imports. Feature APIs and modules belong to their feature packages.
- `src/index.ts` default-exports `createApp(...)`, never calls `start()` or reads credentials. The CLI owns process signals and exit codes.
- No `chamvi.entry` field is needed. Source commands default to `src/index.ts`; built commands default to `dist/index.mjs`.
- Only `uiModule()` is enabled initially. Optional module factories can read environment variables at construction; install/configure a feature before enabling it.
- Use channel subscriptions and provider/model identifiers with `/`. Run a cron job with its `subscription`, including whitespace as a single argv argument.
- Zod schemas validate tool inputs and HTTP payloads. Authentication precedes protected request bodies. Do not log credentials or payloads merely to debug schema failures.
- Side effects that must survive retries belong in chamvi effect tools; the example counter is a pure tool. Approvals carry ids and require authenticated answers.

## Workflow

Change tests before nontrivial behavior. Run build, test, typecheck and lint after changes and report every failing check. The README embeds the example file verbatim, so update both together.

Do not edit generated `dist/`, put production runtime behavior in test utilities, or claim a passing smoke test proves model execution. Keep `.env`, registry credentials and scratch output out of commits. `package-lock.json` is committed and must resolve from `https://registry.npmjs.org/` only.

Commit messages use Conventional Commits. No AI attribution or em dashes in commit/issue/PR text. This starter has no release-please, commitlint or husky configuration; future application image versions come from explicit release tags, not npm package releases.

## Documentation

Update README for user-facing behavior and these guides for layout/testing/deployment changes. Document only commands that exist now.
