import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { readConfig } from '@chamvi/app';
import { expect, it } from 'vitest';

it('provides placeholders accepted by the real config reader without a provider key', () => {
    const env = parseEnv(readFileSync('.env.example', 'utf8'));
    const config = readConfig(env, { mode: 'start', dev: true });
    expect(config.http).toMatchObject({ port: 3000, host: '127.0.0.1' });
    expect(config.tokens).toEqual([{
        value: 'change-me-dev-token-0001',
        id: 'dev',
        permissions: ['*'],
    }]);
    expect(env.ANTHROPIC_API_KEY).toBe('');
    expect(config.store.url).toBeUndefined();
});
