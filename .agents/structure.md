# Project Structure

```text
agent-template/
├── src/
│   ├── index.ts                 # Default-exported app, no start call
│   ├── modules.ts               # UI enabled; optional feature examples commented
│   └── agents/example.ts        # HTTP + cron agent, count_words tool
├── test/
│   ├── vitest.config.ts         # Unit glob, real installed package resolution
│   ├── unit/                    # App, example, entry, build, CLI, docs, env, lockfile, tags, deploy
│   └── utils/                   # Scripted model, loopback port, child processes
├── scripts/
│   ├── image-tags.sh            # POSIX sh: the image tags of the current ref (CI)
│   └── image-smoke.sh           # POSIX sh: read-only container smoke (CI and local)
├── deploy/
│   ├── flux/                    # Namespace, OCIRepository, HelmRelease, image automation, Secret example
│   └── kind/values.yaml         # Chart values for a local kind cluster
├── .github/
│   ├── workflows/ci.yml         # Checks, workflow lint, Docker smoke, Flux validation, image push
│   └── dependabot.yml           # npm, docker, github-actions
├── .agents/                     # Development and deployment guides (references/ for external projects)
├── Dockerfile                   # Two stages, runtime on ghcr.io/chamvi/node:24 by digest
├── .env.example                 # Local placeholders, optional env groups
├── package.json, package-lock.json
├── tsconfig.json                # Typechecking only, includes src and test
├── eslint.config.js             # House config, generated folders ignored
├── README.md
├── LICENSE
└── NOTICE
```

`dist/`, `node_modules/`, `.tmp/` (test build output) and `.env` are ignored.

## Responsibilities

| File | Responsibility |
|---|---|
| `src/index.ts` | Compose agents/modules into `createApp`, default-export it |
| `src/agents/example.ts` | Export `example`, `countWords`, `EXAMPLE_MODEL`; no process lifecycle |
| `src/modules.ts` | Enable `uiModule()`; document feature-package module imports |
| `test/utils/model.ts` | V4 scripted stream and `AppOptions.models` provider override |
| `test/utils/process.ts` | Isolated-env CLI subprocesses, captured output, timeout and temp folders |

The app is not a library and has no barrel export API. Add code agents under `src/agents/` and register them in the entry. Optional folder agents live under `CHAMVI_AGENTS_DIR/<name>/agent.ts` or `./agents/<name>/agent.ts`, with matching agent/folder names and no nested dependency installs.

## Dependencies

- `@chamvi/app`: core agent API, HTTP/cron subscriptions, config, store and lifecycle.
- `@chamvi/cli`: dev/build/start/run-job/migrate process entry points.
- `@chamvi/ui`: dashboard server module and prebuilt browser app.
- `ai`, `@ai-sdk/anthropic`: model/tool types, streaming and Anthropic provider.
- `zod`: tool input and HTTP subscription schemas.
- `typeorm`, `pg`: required app peers for PostgreSQL storage.

Feature packages are added only when their commented module is enabled.
