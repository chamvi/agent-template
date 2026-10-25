import { expect, it } from 'vitest';

it('resolves the installed app and UI surface used by this starter', async () => {
    const app = await import('@chamvi/app');
    for (const name of ['createApp', 'isApp', 'defineAgent', 'defineTool', 'consoleChannelModule'] as const) {
        expect(typeof app[name]).toBe('function');
    }
    expect(typeof app.http.on).toBe('function');
    expect(typeof app.cron.on).toBe('function');
    expect(typeof (await import('@chamvi/ui/module')).uiModule).toBe('function');
});
