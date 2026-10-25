import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';

it.each([
    ['tag', 'v1.2.3', '1.2.3\n', 0],
    ['tag', 'v1.2.3-rc.1', '1.2.3-rc.1\n', 0],
    ['tag', 'v1.2', '', 1],
    ['tag', 'v1.2.3-', '', 1],
    ['tag', 'release-1', '', 1],
    ['branch', 'feature', '', 1],
    ['branch', 'main', '', 1],
])('tags %s %s', (type, name, stdout, code) => {
    const result = spawnSync('sh', [resolve('scripts/image-tags.sh')], {
        encoding: 'utf8',
        env: {
            PATH: process.env.PATH, 
            GITHUB_REF_TYPE: type, 
            GITHUB_REF_NAME: name, 
        },
    });
    expect([result.status, result.stdout], result.stderr).toEqual([code, stdout]);
});

it('formats main tags and propagates a failed timestamp lookup', () => {
    const directory = mkdtempSync(join(tmpdir(), 'tag-fixture-'));
    try {
        // Read-only command seam: no fixture commits in another worktree.
        writeFileSync(join(directory, 'git'), '#!/bin/sh\n[ "$*" = "log -1 --format=%ct HEAD" ] || exit 9\n[ "${FAIL_HISTORY:-}" != 1 ] || exit 1\nprintf "1792540800\\n"\n', { mode: 0o755 });
        const env = {
            PATH: `${directory}:${process.env.PATH}`,
            GITHUB_REF_TYPE: 'branch',
            GITHUB_REF_NAME: 'main',
            GITHUB_SHA: 'abc1234def',
        };
        const script = resolve('scripts/image-tags.sh');
        const result = spawnSync('sh', [script], { encoding: 'utf8', env });
        expect([result.status, result.stdout]).toEqual([0, 'main-abc1234-1792540800\n']);
        const failed = spawnSync('sh', [script], { encoding: 'utf8', env: { ...env, FAIL_HISTORY: '1' } });
        expect([failed.status, failed.stdout]).toEqual([1, '']);
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});
