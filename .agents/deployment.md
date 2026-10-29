# Deployment

## Pipeline

`.github/workflows/ci.yml` runs on pull requests, pushes to `main` and `v*` tags: `check` (lint, typecheck, test on Node 22 and 24), `workflows` (actionlint, shellcheck), `docker` (`docker build` plus `scripts/image-smoke.sh`), `deploy` (kubeconform against the Flux v2.9.6 CRD schemas, `helm template` of `oci://ghcr.io/chamvi/helm/agent-app` with the release and kind values), then on a push `image`: `tada5hi/craneship@v4` pushes `ghcr.io/<owner>/<repo>` for linux/amd64 and linux/arm64 with the tags `scripts/image-tags.sh` prints (`main-<sha7>-<commit unix ts>` on `main`, `<semver>` on `v<semver>`; `gitTag: 'false'`, so the script is the only tag source). Only that job has `packages: write`.

## Process and Environment

Build with `npm run build`, then start with `npm run start` using the process environment. `start` does not load `.env`; local explicit loading is `node --env-file=.env node_modules/@chamvi/cli/dist/cli.mjs start`. `dev` loads `.env` itself.

| Variable | Role |
|---|---|
| `HOST`, `PORT` | Local example is `127.0.0.1:3000`; containers must listen on `0.0.0.0` |
| `ANTHROPIC_API_KEY` | Required by the example's provider; a missing key prevents startup |
| `CHAMVI_TOKENS` | JSON token list; replace the public dev sample, scope grants narrowly |
| `DATABASE_URL` | PostgreSQL durable storage; unset is memory lost on restart |
| `CHAMVI_MIGRATE` | Migrations run at startup by default when `DATABASE_URL` is set; `false` applies them only through `chamvi migrate` |
| `CHAMVI_PUBLIC_URL` | Public origin, without the app base path |
| `CHAMVI_BASE_PATH` | Shared HTTP prefix, such as `/api` |
| `CHAMVI_SCHEDULER` | In-process cron firing, disable for external CronJobs |
| `CHAMVI_AGENTS_DIR` | Optional folder agents beside the explicit entry |

Use the [complete environment reference](https://chamvi.dev/reference/app#environment) for limits and optional authentication/features. Never commit real Secret contents. Use SOPS or External Secrets in a fleet repository.

## Routing and Approvals

For origin `https://agents.example.com` and base path `/api`, UI approvals live under `/api/ui/approvals` and GitHub intake is `/api/channels/github`. Do not include `/api` in both variables: the app appends the base path. Approval links contain run/approval ids only; the signed-in user's permissions authorize an answer. Channel modules supply delivery, tools initiate it.

## Scheduling and Shutdown

Use one scheduling strategy: the running app's cron channel or chart `cronJobs` (the chart then sets `CHAMVI_SCHEDULER=false` on the service). The example job is `chamvi run-job example 'cron:0 8 * * 1'`; agent and subscription id are positional CLI arguments. Keep the id a single argument. Jobs and the service must share durable storage.

Coordinate the pod termination grace period with readiness delay, engine drain, server close and CLI force-exit settings. On SIGTERM, readiness fails, intake/schedules stop, executions drain, then storage closes. `test/unit/cli.spec.ts` (the CLI) and `scripts/image-smoke.sh` (the image, through tini) verify exit 0 on SIGTERM; the drain inside a pod's grace period and restart recovery need a cluster (the README's "Try it on kind" steps).

## Image and Flux

The image builds on `node:24-trixie-slim` and runs on `ghcr.io/chamvi/node:24` pinned by digest (Dependabot's docker updates move it): tini, uid 1000, `/app`, `CMD node node_modules/@chamvi/cli/dist/cli.mjs start`. It writes nothing outside `/tmp`, so it runs with a read-only root, as the chart requires; `scripts/image-smoke.sh` checks that and exit code 0 on `docker stop`.

### Optional skills

First-class skills require a compatible chamvi release and a runtime `@chamvi/skills` dependency. Import `gitSkills`,
`loadSkillBundle` and review helpers from its main entry, never a skills `/module` or app helper export. Keep the
entry synchronous: `gitSkills` only describes a source and startup installs/verifies it. App `skills` supplies defaults
for every code/folder agent; agent `skills` adds scoped extras. No manual tool/instruction composition is needed.

When adopting Git sources, raise the starter's Node >=22.18 floor to >=22.20. The current runtime base uses Node 24
but has no Git. Insert this immediately after the existing pinned final `FROM ghcr.io/chamvi/node:24@sha256:...`:

```dockerfile
USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*
USER 1000:1000
# Keep the existing runtime COPY, EXPOSE and CMD instructions below.
```

Use absolute distinct managed directories `/tmp/chamvi-skills/common` and `/tmp/chamvi-skills/maintainer` in
`gitSkills`; uid 1000 can write them on the existing `/tmp` mount with the root read-only. `/app` cannot be a
startup destination. Every pod/CronJob prepares its own corpus, with verification again on restart even when
emptyDir survives. The chart needs no new mount, env variable or RBAC. Private source credentials/network must work
from the app and every CronJob, not just sandbox pods. envFrom Secrets are available, but a generic Git token
variable does not guarantee the clone SDK consumes it; validate the configured source/auth flow. Sandbox egress
policies select sandbox pods only, so external app policies must permit DNS and source/auth endpoints.

Required preparation completes before HTTP starts; `/healthz` stays unavailable until then. Set the existing chart
values in both your Flux/kind deployment configuration as needed, based on measured migrations + fetch + verification:

```yaml
probes:
    startup:
        periodSeconds: 2
        timeoutSeconds: 2
        failureThreshold: 150
```

That example permits approximately 300 seconds. CronJobs have no HTTP startup probe but still need runtime Git,
credentials/network and writable paths for `run-job`. The default starter smoke fixture does not enable remote
skills; its timeout is unchanged. If you enable remote skills in an image smoke fixture, adjust its wait budget too.
Stop joins source cleanup, including a clone that may ignore cancellation; CLI force-exit and pod grace are the
operator bounds. There is no guaranteed fast shutdown during a clone.

Globals/code sources verify before `engineCreated`; folder extras verify later before serving. Verification failure
prevents HTTP/channels/model work. `start --check` is read-only and skips skill providers, installation and remote
content verification; migrate also skips preparation. A clean preflight does not establish source availability.

Alternatively, include reviewed ready bundles with an explicit runtime-stage `COPY approved-skills ./approved-skills`
(the Dockerfile otherwise copies only JS/dependencies), readable by uid 1000, and pass
`loadSkillBundle({ name, version, hash, directory: '/app/approved-skills/audit' })` in the app/agent `skills` array.
Manual catalogs remain supported. Review content and full source commit separately; computing `hashSkillBundle` is
never approval. Source/bundle directories are not watched. Change reviewed commits/bytes/content pins together:
saved results keep old checkpoint bytes, pending/future loads use the new snapshot. Global changes alone do not
change folder revisions; finish/cancel unsettled runs before an upgrade if mixed-version disclosure is unacceptable.
Tracked agent extras retain existing revision cancellation behavior.

The Flux source is `oci://ghcr.io/chamvi/helm/agent-app` (`>=0.1.0 <0.2.0`). Rename app/release identifiers, namespace, image, image-policy markers and the kind values' Secret name consistently; `test/unit/deploy.spec.ts` derives every expected name from the manifests, so a consistent rename passes. The release sets only keys of the chart's `values.yaml`; the chart owns `PORT`, `CHAMVI_BASE_PATH` (its `basePath` value) and, with `cronJobs`, `CHAMVI_SCHEDULER=false`. Main-branch tags are selected by their numeric timestamp, release tags by semver. Image automation belongs in the fleet repository.

New GHCR images are private by default. A private image needs credentials for both Flux scanning (`ImageRepository.spec.secretRef`) and pod pulls (`imagePullSecrets`). The `ghcr.io/chamvi/*` images and the chart need no pull secrets.

Before enabling Kubernetes sandboxes, add the provider package, least-privilege RBAC and tested network policy. Workspace isolation alone does not prevent reaching cluster services or cloud metadata. Workspace pods run as root with a writable root filesystem by default (so `apt` and toolchain installs work), which needs a sandbox namespace labelled for Pod Security `baseline`; the provider's `user` and `readOnlyRoot` options restore a `restricted`-compatible pod.

Replace the placeholder release image tag before the first deployment (image automation rewrites it afterwards) and create the Secret separately.
