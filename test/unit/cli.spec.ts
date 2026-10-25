import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';
import { freePort } from '../utils/port.ts';
import { CLI, startNode, temporaryDirectory } from '../utils/process.ts';

it('starts the built entry, serves authenticated HTTP/UI and exits 0 on SIGTERM', async () => {
    const directory = await temporaryDirectory('cli-');
    try {
        const build = await startNode([CLI, 'build', '--out-dir', directory]).result;
        expect(build, build.stderr).toMatchObject({ code: 0 });
        const port = await freePort();
        const base = `http://127.0.0.1:${port}`;
        const token = 'test-token-0000000001';
        const { child, result } = startNode([CLI, 'start', '--entry', join(directory, 'index.mjs')], {
            PORT: String(port),
            HOST: '127.0.0.1',
            ANTHROPIC_API_KEY: 'test-dummy-not-a-real-key',
            CHAMVI_SCHEDULER: 'false',
            CHAMVI_DRAIN_TIMEOUT_MS: '2000',
            CHAMVI_FORCE_EXIT_MS: '5000',
            CHAMVI_TOKENS: JSON.stringify([{
                value: token, 
                id: 'test', 
                permissions: ['*'], 
            }]),
        });
        try {
            await vi.waitFor(async () => {
                if (child.exitCode !== null) throw new Error((await result).stderr);
                expect((await fetch(`${base}/readyz`, { signal: AbortSignal.timeout(1000) })).status).toBe(200);
            }, { timeout: 10_000 });
            expect((await fetch(`${base}/ui/`)).status).toBe(200);
            expect((await fetch(`${base}/agents`)).status).toBe(401);
            const agents = await fetch(`${base}/agents`, { headers: { authorization: `Bearer ${token}` } });
            expect(agents.status).toBe(200);
            expect(await agents.json()).toMatchObject({ data: [expect.objectContaining({ name: 'example' })] });
            child.kill('SIGTERM');
            const stopped = await result;
            expect(stopped, stopped.stderr).toMatchObject({ code: 0, signal: null });
        } finally {
            if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
            await result;
        }
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

it('exits 2 for an entry that is not an app', async () => {
    const directory = await temporaryDirectory('invalid-');
    try {
        const entry = join(directory, 'index.mjs');
        await writeFile(entry, 'export default {};\n');
        const result = await startNode([CLI, 'start', '--entry', entry]).result;
        expect(result).toMatchObject({ code: 2, signal: null });
        expect(result.stderr).toMatch(/createApp/);
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});
