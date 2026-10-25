import { existsSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

type Lockfile = { packages: Record<string, { resolved?: string }> };

it.skipIf(!existsSync('package-lock.json') || !!process.env.CHAMVI_SKIP_LOCKFILE)(
    'resolves every locked package from registry.npmjs.org',
    () => {
        const lock = JSON.parse(readFileSync('package-lock.json', 'utf8')) as Lockfile;
        const offenders = Object.entries(lock.packages)
            .filter(([, pkg]) => pkg.resolved && new URL(pkg.resolved).origin !== 'https://registry.npmjs.org')
            .map(([name]) => name);
        expect(offenders).toEqual([]);
    },
);
