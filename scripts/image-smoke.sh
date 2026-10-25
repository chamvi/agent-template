#!/bin/sh
# Runs an image the way the agent-app chart does (read-only root, writable
# /tmp, uid 1000), waits for /readyz, then checks that `docker stop` (SIGTERM
# through tini) ends the app with exit code 0.
# Usage: sh scripts/image-smoke.sh <image> [host port]
set -eu

image=${1:?usage: image-smoke.sh <image> [host port]}
port=${2:-3000}
token='smoke-token-0000000001'

uid=$(docker run --rm "$image" id -u)
if [ "$uid" != 1000 ]; then
    echo "image runs as uid $uid, expected 1000" >&2
    exit 1
fi

container=$(docker run -d --read-only --tmpfs /tmp --user 1000:1000 \
    -p "127.0.0.1:$port:3000" \
    -e "CHAMVI_TOKENS=[{\"value\":\"$token\",\"id\":\"smoke\",\"permissions\":[]}]" \
    -e ANTHROPIC_API_KEY=smoke-dummy-not-a-real-key \
    "$image")
trap 'docker rm -f "$container" >/dev/null 2>&1 || true' EXIT

fail() {
    docker logs "$container" >&2 || true
    echo "$1" >&2
    exit 1
}

attempt=0
until curl -fsS "http://127.0.0.1:$port/readyz" >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 60 ]; then
        fail 'readyz did not answer 200 within 60 s'
    fi
    if [ "$(docker inspect -f '{{.State.Running}}' "$container")" != true ]; then
        fail 'the container exited before it was ready'
    fi
    sleep 1
done
echo "readyz 200 after ${attempt} s"

curl -fsS -o /dev/null "http://127.0.0.1:$port/ui/" || fail 'the dashboard at /ui/ did not answer 200'
echo 'ui 200'

docker stop -t 120 "$container" >/dev/null
code=$(docker inspect -f '{{.State.ExitCode}}' "$container")
if [ "$code" != 0 ]; then
    fail "docker stop ended the app with exit code $code, expected 0"
fi
echo 'stopped with exit code 0'
