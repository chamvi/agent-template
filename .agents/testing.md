# Testing

## Commands

```bash
npm run test
npm run test -- test/unit/example.spec.ts
npm run build
npm run typecheck
npm run lint
```

Vitest loads `test/unit/**/*.spec.ts`, with 30-second test and hook timeouts. Tests resolve installed package exports, not source aliases. The UI package must include its built dashboard. No Docker, database server or provider key is needed for this starter suite.

## Test Layers

- `smoke.spec.ts`: installed common app exports.
- `example.spec.ts`: whitespace counting, channel subscriptions, real scheduled execution and failed-run exit code.
- `app.spec.ts`: real loopback server, auth, schema/media-type rejection, UI JavaScript assets, idempotency and stored tool output.
- `entry.spec.ts`: app default export, no model-registry install on import, missing provider key rejection.
- `env-example.spec.ts`: `.env.example` through Node `parseEnv` and the actual app config parser.
- `build.spec.ts`: real CLI build, external dependency imports, importable output.
- `cli.spec.ts`: built app serving HTTP/UI, SIGTERM exit 0, invalid-entry exit 2.
- `readme.spec.ts`: verbatim example and documented npm script names.
- `lockfile.spec.ts`: resolved URLs must belong to `https://registry.npmjs.org`.
- `image-tags.spec.ts`: `scripts/image-tags.sh` for main, semver tags and refused refs (a fake `git` on `PATH`).
- `deploy.spec.ts`: Flux API versions, one app name, namespace and image across `deploy/flux`, and only agent-app chart value keys in `release.yaml` and `deploy/kind/values.yaml`.

## Helpers and Isolation

Use `fakeModel(turns)` from `test/utils/model.ts` for model responses. It emits V4 streams, records calls through the AI SDK test model and fails if a script is exhausted. `fakeModels(model)` passes it through `createApp({ models })`, exercising the actual registry path. Never replace that path with a production workaround to make a dependency failure disappear.

Keep the engine, tool execution, store and app lifecycle real. Assert the tool result reaches the next model prompt or stored run, not merely that a run says `completed`. Always `stop()` the app in cleanup. Disable schedules in HTTP and CLI tests to prevent unsolicited dispatches.

`freePort()` uses a loopback ephemeral port. Subprocess tests pass only PATH plus explicit test variables; real credentials are not inherited. Build outputs stay under ignored `.tmp/` inside the repo so bare imports resolve dependencies. Remove temp directories and kill remaining children in `finally`.

Real short timers are used only for these process/socket integration tests. Add clock-driven tests for new time-dependent application logic rather than sleeps. No coverage threshold or separate coverage command is configured.

## Checks Outside Vitest

- `docker run --rm -v "$PWD:/mnt" koalaman/shellcheck:v0.11.0 -s sh /mnt/scripts/image-tags.sh /mnt/scripts/image-smoke.sh` (the Ubuntu runners' `/bin/sh` is dash, so bashisms fail there while the specs pass under macOS bash).
- `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.12 -color`.
- `docker build -t agent-template:local . && sh scripts/image-smoke.sh agent-template:local`.
- kubeconform v0.8.0 over `deploy/flux` with the Flux v2.9.6 `crd-schemas.tar.gz` and `helm template` of the published chart with the release and kind values (the CI `deploy` job holds the exact commands).

A green readiness check alone does not prove model execution; the example and app specs assert that the tool result reaches the next model call and the stored run. `CHAMVI_SKIP_LOCKFILE=1` skips the lockfile spec and is never set in CI.
