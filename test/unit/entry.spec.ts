import { createApp, isApp } from '@chamvi/app';
import { expect, it } from 'vitest';
import { example } from '../../src/agents/example.ts';
import { freePort } from '../utils/port.ts';

it('default-exports an app without starting its model registry', async () => {
    const provider = globalThis.AI_SDK_DEFAULT_PROVIDER;
    const entry = await import('../../src/index.ts');
    expect(isApp(entry.default)).toBe(true);
    expect(globalThis.AI_SDK_DEFAULT_PROVIDER).toBe(provider);
});

it('refuses to start without the provider key', async () => {
    const app = createApp({ model: 'anthropic/claude-sonnet-5-5', agents: [example] });
    try {
        await expect(app.start({
            env: {
                PORT: String(await freePort()),
                HOST: '127.0.0.1',
                ANTHROPIC_API_KEY: '',
                CHAMVI_TOKENS: JSON.stringify([{
                    value: 't'.repeat(16),
                    id: 'test',
                    permissions: [],
                }]),
            },
        })).rejects.toThrow(/ANTHROPIC_API_KEY/);
    } finally {
        await app.stop();
    }
});
