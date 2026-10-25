import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isApp } from '@chamvi/app';
import { expect, it } from 'vitest';
import { CLI, startNode, temporaryDirectory } from '../utils/process.ts';

it('builds an importable app while keeping dependencies external', async () => {
    const directory = await temporaryDirectory('build-');
    try {
        const result = await startNode([CLI, 'build', '--out-dir', directory]).result;
        expect(result, result.stderr).toMatchObject({ code: 0, signal: null });
        const entry = join(directory, 'index.mjs');
        const source = await readFile(entry, 'utf8');
        // External imports are part of the distribution contract, not a source-style assertion.
        expect(source).toMatch(/from ["']@chamvi\/app["']/);
        expect(source).toMatch(/from ["']@chamvi\/ui\/module["']/);
        expect(isApp((await import(pathToFileURL(entry).href)).default)).toBe(true);
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});
