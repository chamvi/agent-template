# chamvi agent template

Build a self-hosted [chamvi](https://chamvi.dev) agent with HTTP intake, a weekly schedule, tools and a dashboard, then ship it as an image and deploy it with Flux.

This single-package TypeScript app leaves run checkpoints, channels, approvals and shutdown to chamvi. You own the agent instructions and tools.

## Use this template

```bash
gh repo create <owner>/<name> --template chamvi/agent-template --private --clone
```

GitHub does not substitute names. In your new checkout:

- Change `package.json`'s `name` from `agent-template`.
- In `deploy/flux` and `deploy/kind/values.yaml`, replace the app/release name `agent-template`, the namespace `agents` and the image `ghcr.io/chamvi/agent-template` (with `ghcr.io/<owner>/<name>`) everywhere, including the `$imagepolicy` markers and the Secret name `agent-template-env`. Do the same in README.md's "Try it on kind" block (image, Secret, release and Service names, namespace). `test/unit/deploy.spec.ts` and `test/unit/readme.spec.ts` fail while the names disagree.
- `package-lock.json` keeps the old root name until `npm install --package-lock-only` refreshes it; `npm ci` accepts either.
- Review and replace `LICENSE` and `NOTICE` for your own project.
- Find what is left:

```bash
grep -rln 'agent-template' . --exclude-dir=node_modules --exclude-dir=.git
```

Use Node **22.18 or newer** (Node 24 is in `.nvmrc`) and npm. This is an ESM application, not an npm library. `package-lock.json` is committed and resolves every package from `https://registry.npmjs.org/` (`test/unit/lockfile.spec.ts` checks it), so CI and the image build use `npm ci`.

## Develop

```bash
npm ci
cp .env.example .env
# Fill ANTHROPIC_API_KEY in .env and keep that file private.
npm run dev
```

`dev` loads `.env`, watches `src/` and restarts on a change. The dashboard is at <http://localhost:3000/ui/>; sign in with the local sample token `change-me-dev-token-0001`. The example binds to `127.0.0.1`; never expose the shared sample token on a network.

Start a run:

```bash
curl -H 'content-type: application/json' \
    -H 'authorization: Bearer change-me-dev-token-0001' \
    -d '{"payload":{"text":"One small agent with durable runs."},"idempotencyKey":"first-example"}' \
    http://localhost:3000/agents/example/runs
```

The answer is `202` with `runId` and `deduplicated`. Keep the idempotency key when retrying the same request; change it for a new run. The JSON content type is required: plain `curl -d` sends a form body and gets `415`. Empty, missing or longer than 10,000 characters text gets `400` with the validation issues.

Read the run:

```bash
curl -H 'authorization: Bearer change-me-dev-token-0001' \
    http://localhost:3000/runs/<runId>
```

The answer is the run itself with `status`, `output` and `steps`. Without `DATABASE_URL`, runs live in memory and are gone after a restart; use PostgreSQL for anything durable. The weekly schedule fires in the running app unless `CHAMVI_SCHEDULER=false`; every run calls your provider account.

## The example agent

`src/agents/example.ts`, embedded verbatim and type-checked with the app:

```ts
import {
    cron,
    defineAgent,
    defineTool,
    http,
} from '@chamvi/app';
import { z } from 'zod';

export const EXAMPLE_MODEL = 'anthropic/claude-sonnet-5-5';

export const countWords = defineTool({
    description: 'Count the whitespace-separated words in a text.',
    inputSchema: z.object({ text: z.string() }),
    execute: async ({ text }) => ({ words: text.match(/\S+/gu)?.length ?? 0 }),
});

export const example = defineAgent({
    name: 'example',
    model: EXAMPLE_MODEL,
    instructions: 'Summarize the supplied text in one sentence. Call count_words on the text first and state the word count in your answer.',
    channels: [
        http.on({ schema: z.object({ text: z.string().min(1).max(10_000) }) }),
        cron.on('0 8 * * 1', {
            timezone: 'Europe/Berlin',
            payload: { text: 'Weekly check-in: say hello and report the word count of this sentence.' },
        }),
    ],
    tools: { count_words: countWords },
    budget: { maxSteps: 5 },
});
```

The model is told to call `count_words` before it summarizes. The tool counts non-empty whitespace-separated words. The cron subscription (id `cron:0 8 * * 1`) fires at 08:00 on Mondays in `Europe/Berlin`, following its daylight-saving changes. Model ids are `<provider>/<model>`, with a slash; the Anthropic provider reads `ANTHROPIC_API_KEY`.

## Add an agent / add a module

1. Add `src/agents/<name>.ts`, exporting a `defineAgent(...)` result with a unique kebab-case name.
2. Import it in `src/index.ts` and append it to the `agents` array.
3. Add a test with the fake model (see Test).

Import the agent API from `@chamvi/app`, not `@chamvi/core` or `orkos`. Relative imports carry `.ts`, and `src/index.ts` stays a synchronous `export default createApp(...)` that starts nothing.

`src/modules.ts` enables only the dashboard. Install a feature package before uncommenting its import and module:

| Module | Install | What it adds |
|---|---|---|
| `uiModule()` | `@chamvi/ui` (included) | The dashboard at `/ui/` |
| `githubModule()` | `@chamvi/github` | The `github` channel: signed deliveries at `/channels/github`, comments and approval links out |
| `sandboxModule({ provider: 'kubernetes' })` | `@chamvi/sandbox`, `@chamvi/sandbox-k8s` | Run-scoped workspaces; needs a namespace, RBAC and network policy |
| `openclawModule()` | `@chamvi/channel-openclaw` | The `openclaw` channel: messages to a concrete OpenClaw destination |
| `consoleChannelModule()` | Nothing extra | The `console` channel: messages on stderr |

Feature modules come from the package's `/module` subpath (`@chamvi/github/module`); `consoleChannelModule` comes from `@chamvi/app`. Module factories read their environment when called. GitHub tools get the shared app with `injectGithubContext(ctx)` from `@chamvi/github`; tools reach a channel with `ctx.channels.findOne(name)`.

Folder agents are optional next to the code agents: put a default-exported agent in `agents/<name>/agent.ts` (or the directory in `CHAMVI_AGENTS_DIR`), named like its folder. The app loads and watches them in start mode.

## Test

```bash
npm run test
npm run typecheck
npm run lint
```

The tests script the model only: `fakeModel()` (`test/utils/model.ts`, `MockLanguageModelV4` from `ai/test`) goes in through `createApp({ models })`, while the app, engine, tools, store and HTTP stay real. They run the cron job with `runJob()`, start the app on a loopback port with `start()`, build it with `chamvi build` and stop `chamvi start` with SIGTERM. No test needs a provider key, Docker or a database.

## Build and run the image

```bash
docker build -t agent-template:local .
sh scripts/image-smoke.sh agent-template:local
```

The Dockerfile builds with `npm ci` and `chamvi build` on `node:24-trixie-slim`, then copies `package.json`, `dist/` and the production `node_modules/` (minus the build toolchain and its dependencies, which `npm prune --omit=dev` keeps because of `@chamvi/cli`'s optional `tsdown` peer) onto `ghcr.io/chamvi/node:24` (pinned by digest; tini, uid 1000, `/app`). `scripts/image-smoke.sh` fails when the image ships the toolchain or any package `npm ls` reports as extraneous, runs it the way the chart does (read-only root, a `/tmp` tmpfs, uid 1000), waits for `/readyz` and `/ui/`, and checks that `docker stop` ends it with exit code 0. The CI `docker` job runs the same script.

Outside Docker, `npm run build` writes `dist/index.mjs` with every dependency external and `npm run start` runs it with the process environment (it does not read `.env`).

CI (`.github/workflows/ci.yml`) runs lint, typecheck and test on Node 22 and 24, actionlint and shellcheck, the Docker smoke and the Flux validation, then pushes the image with [craneship](https://github.com/tada5hi/craneship) for linux/amd64 and linux/arm64:

| Ref | Tag (`scripts/image-tags.sh`) |
|---|---|
| a push to `main` | `main-<sha7>-<commit unix time>` |
| a tag `v1.2.3` | `1.2.3` |

The image is `ghcr.io/<owner>/<repo>`, pushed with the workflow's `GITHUB_TOKEN`.

## Try it on kind

`deploy/kind/values.yaml` installs a locally built image with the [agent-app chart](https://github.com/chamvi/helm) on a [kind](https://kind.sigs.k8s.io) cluster:

```bash
docker build -t agent-template:kind .
kind load docker-image agent-template:kind
kubectl create namespace agents
kubectl -n agents create secret generic agent-template-env \
    --from-literal=CHAMVI_TOKENS='[{"value":"change-me-at-least-16-characters","id":"owner","permissions":["*"]}]' \
    --from-literal=ANTHROPIC_API_KEY=<your key>
helm install agent-template oci://ghcr.io/chamvi/helm/agent-app --version '>=0.1.0 <0.2.0' -n agents \
    -f deploy/kind/values.yaml --wait
kubectl -n agents port-forward svc/agent-template-agent-app 8080:80
```

Then `curl localhost:8080/readyz` answers `200` and the dashboard is at `http://localhost:8080/ui/`. The chart names its objects `<release>-agent-app`, unless the release name already contains `agent-app`, in which case it uses the release name alone (`kubectl -n agents get svc` shows it). Without `DATABASE_URL` in the Secret, runs live in memory and are gone with the pod.

## Deploy with Flux

`deploy/flux` deploys the image with the [agent-app chart](https://github.com/chamvi/helm) from `oci://ghcr.io/chamvi/helm/agent-app`:

| File | Object |
|---|---|
| `namespace.yaml` | Namespace `agents` |
| `chart.yaml` | `OCIRepository` for the chart (`>=0.1.0 <0.2.0`) |
| `release.yaml` | `HelmRelease` with the image, the env Secret, `CHAMVI_PUBLIC_URL` and the ingress |
| `kustomization.yaml` | The three above |
| `secret.example.yaml` | The env Secret's shape (not in the kustomization) |
| `image-automation.yaml` | `ImageRepository`, `ImagePolicy`, `ImageUpdateAutomation` for your fleet repo |

Create the Secret `agent-template-env` out of band (SOPS or External Secrets, never committed in plain text); it holds `ANTHROPIC_API_KEY`, `CHAMVI_TOKENS` and `DATABASE_URL`. Copy `image-automation.yaml` into the fleet repository Flux watches (its `GitRepository flux-system`), next to the release: the `ImagePolicy` picks the newest `main-` tag by its timestamp and the automation rewrites the release's `$imagepolicy` markers. For release images switch the policy to `semver` (commented in the file).

Before the first apply, replace two placeholders: `release.yaml`'s image tag `main-0000000-0` (it never exists, so the first install would sit in `ImagePullBackOff`) with a pushed tag, such as the `main-<sha7>-<time>` tag of the last CI image job or a release tag, and the `ImageUpdateAutomation`'s `spec.update.path` `./clusters/<cluster>` with the fleet directory that holds `release.yaml`. Afterwards the automation rewrites the tag.

Set `CHAMVI_PUBLIC_URL` to the public origin only (with the ingress enabled and no value, the chart derives it from the ingress host); the chart's `basePath` value sets `CHAMVI_BASE_PATH`, and approval links get it once. The GitHub channel then listens at `<basePath>/channels/github`.

Pick one scheduler: the app fires its cron subscriptions, or the chart's `cronJobs` value runs `chamvi run-job example 'cron:0 8 * * 1'` as a Kubernetes CronJob and sets `CHAMVI_SCHEDULER=false` on the app (commented in `release.yaml`). Jobs and the app must share one database. A failed `chamvi run-job` prints only `<agent>: failed (run <id>)` and exits 1; the run's error stays on the stored run, readable in the dashboard or `GET /runs/<id>` only when the Secret carries `DATABASE_URL` (in memory it is gone with the job's pod).

The environment variables are listed in the [app reference](https://chamvi.dev/reference/app#environment). A missing provider key stops `chamvi start` with exit code 2, so `/readyz` never turns green.

## Images are private by default

The first push of `ghcr.io/<owner>/<repo>` creates a private package. Either make it public in the package settings, or give Flux credentials for scanning (`ImageRepository.spec.secretRef`) and the pods a pull Secret (the chart's `imagePullSecrets` value); both are commented in `deploy/flux`. The `ghcr.io/chamvi/*` images and the chart need none.

## License

[Apache-2.0](LICENSE). See [NOTICE](NOTICE); replace both for your own repository.
