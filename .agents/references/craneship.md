# craneship v4 reference

Read-only reference verified 2026-10-25 at fcdbb02c68b952fc6c6d16901dd9b31250d60e09.

- action.yml: registryTag takes newline-separated tags; platforms enables QEMU/buildx push. Defaults use ghcr.io, github.repository and github.token.
- src/module.ts deriveTags (36-61): gitTag true adds the trimmed tag in addition to explicit registryTag values. Use gitTag false with scripts/image-tags.sh as the sole tag producer.
- src/module.ts (253-260): repository paths are lowercased.
- Correspondence: scripts/image-tags.sh implements the main commit timestamp and v-tag output; the `image` job of .github/workflows/ci.yml passes it as `registryTag` with `gitTag: 'false'` and `platforms: linux/amd64,linux/arm64`. The action itself was not executed locally (it runs in CI on a push).
