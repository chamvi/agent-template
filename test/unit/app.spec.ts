import { createApp } from '@chamvi/app';
import type { IApp } from '@chamvi/app';
import {
    afterAll,
    beforeAll,
    expect,
    it,
    vi,
} from 'vitest';
import { example } from '../../src/agents/example.ts';
import { modules } from '../../src/modules.ts';
import { fakeModel, fakeModels } from '../utils/model.ts';
import { freePort } from '../utils/port.ts';

const TOKEN = 'test-token-0000000001';
let base: string;
let app: IApp;

beforeAll(async () => {
    const port = await freePort();
    base = `http://127.0.0.1:${port}`;
    app = createApp({
        agents: [example],
        modules,
        models: fakeModels(fakeModel([
            { toolCalls: [{ toolName: 'count_words', input: { text: 'one two three' } }] },
            { text: 'Three words.' },
        ])),
    });
    await app.start({
        env: {
            PORT: String(port),
            HOST: '127.0.0.1',
            CHAMVI_SCHEDULER: 'false',
            CHAMVI_TOKENS: JSON.stringify([{
                value: TOKEN,
                id: 'test',
                permissions: ['*'],
            }]),
        },
    });
});
afterAll(async () => app?.stop());

function post(payload: unknown, token: string | undefined = TOKEN): Promise<Response> {
    return fetch(`${base}/agents/example/runs`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ payload, idempotencyKey: 'starter-request' }),
    });
}

it('is ready once start resolves', async () => {
    expect((await fetch(`${base}/readyz`)).status).toBe(200);
});

it('serves the dashboard and its JavaScript from the installed UI build', async () => {
    const res = await fetch(`${base}/ui/`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/^text\/html/);
    const html = await res.text();
    const script = /<script[^>]+src="([^"]+)"/.exec(html)?.[1];
    expect(script).toBeDefined();
    const asset = await fetch(new URL(script!, `${base}/ui/`));
    expect(asset.status).toBe(200);
    expect(asset.headers.get('content-type')).toMatch(/javascript/);
});

it('authenticates the dashboard API', async () => {
    expect((await fetch(`${base}/me`)).status).toBe(401);
    const res = await fetch(`${base}/me`, { headers: { authorization: `Bearer ${TOKEN}` } });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: 'test', permissions: ['*'] });
});

it.each([undefined, 'not-a-valid-token'])('refuses run intake with token %j', async (token) => {
    // Explicitly construct the unauthenticated request, not the helper default.
    const res = await fetch(`${base}/agents/example/runs`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ payload: { text: 'a' } }),
    });
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toBe('Bearer');
});

it.each([
    ['empty', { text: '' }],
    ['too long', { text: 'x'.repeat(10_001) }],
    ['missing', {}],
])('rejects %s text', async (_label, payload) => {
    const res = await post(payload);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: 'bad_request', issues: expect.any(Array) });
});

it('rejects form-encoded intake', async () => {
    const res = await fetch(`${base}/agents/example/runs`, {
        method: 'POST',
        headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/x-www-form-urlencoded' },
        body: 'text=one',
    });
    expect(res.status).toBe(415);
});

it('completes a REST run with a stored tool result and deduplicates retries', async () => {
    const response = await post({ text: 'one two three' });
    expect(response.status).toBe(202);
    const { runId } = await response.json() as { runId: string };
    expect((await fetch(`${base}/runs/${runId}`)).status).toBe(401);
    const retry = await post({ text: 'one two three' });
    expect(retry.status).toBe(202);
    expect(await retry.json()).toMatchObject({ runId, deduplicated: true });
    await vi.waitFor(async () => {
        const res = await fetch(`${base}/runs/${runId}`, { headers: { authorization: `Bearer ${TOKEN}` } });
        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({
            id: runId,
            status: 'completed',
            output: 'Three words.',
            steps: expect.arrayContaining([
                expect.objectContaining({
                    kind: 'tool',
                    name: 'count_words',
                    output: { words: 3 },
                }),
            ]),
        });
    }, { timeout: 2_000 });
});
