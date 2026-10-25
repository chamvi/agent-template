#!/bin/sh
set -eu

if [ "${GITHUB_REF_TYPE:-}" = branch ] && [ "${GITHUB_REF_NAME:-}" = main ]; then
    case "${GITHUB_SHA:-}" in
        ''|*[!a-f0-9]*) echo 'missing or invalid commit SHA' >&2; exit 1 ;;
    esac
    [ "${#GITHUB_SHA}" -ge 7 ] || exit 1
    timestamp=$(git log -1 --format=%ct HEAD) || exit 1
    printf 'main-%s-%s\n' "$(printf '%s' "$GITHUB_SHA" | cut -c1-7)" "$timestamp"
    exit 0
fi

if [ "${GITHUB_REF_TYPE:-}" = tag ] && printf '%s\n' "${GITHUB_REF_NAME:-}" | grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$'; then
    printf '%s\n' "${GITHUB_REF_NAME#v}"
    exit 0
fi

echo "no image tags for ${GITHUB_REF_TYPE:-} ${GITHUB_REF_NAME:-}" >&2
exit 1
