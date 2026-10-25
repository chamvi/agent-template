import { createApp } from '@chamvi/app';
import { expect, it } from 'vitest';
import { countWords, example } from '../../src/agents/example.ts';
import { fakeModel, fakeModels } from '../utils/model.ts';

it.each([
    ['  one two\nthree ', 3],
    [' \t\n ', 0],
    ['', 0],
    ['hello world', 2],
])('counts whitespace-separated words in %j', async (text, words) => {
    expect(await countWords.execute!({ text }, {
        toolCallId: 'count', 
        messages: [], 
        context: {} as never,
    })).toEqual({ words });
});

it('subscribes to HTTP and a weekly Berlin cron job', () => {
    expect(example.name).toBe('example');
    expect(example.definition.channels).toMatchObject([
        { channel: 'http', id: 'http' },
        {
            channel: 'cron', 
            id: 'cron:0 8 * * 1', 
            options: { timezone: 'Europe/Berlin' }, 
        },
    ]);
});

it('executes the scheduled tool call and feeds the count back to the model', async () => {
    const model = fakeModel([
        { toolCalls: [{ toolName: 'count_words', input: { text: 'one two three four five' } }] },
        { text: 'A greeting of five words.' },
    ]);
    const app = createApp({ agents: [example], models: fakeModels(model) });
    try {
        const result = await app.runJob({
            agent: 'example', 
            subscription: 'cron:0 8 * * 1', 
            env: {}, 
        });
        expect(result).toMatchObject({ status: 'completed', exitCode: 0 });
        expect(model.doStreamCalls).toHaveLength(2);
        expect(model.doStreamCalls[1]?.prompt).toEqual(expect.arrayContaining([
            expect.objectContaining({
                role: 'tool',
                content: expect.arrayContaining([
                    expect.objectContaining({
                        type: 'tool-result',
                        toolName: 'count_words',
                        output: { type: 'json', value: { words: 5 } },
                    }),
                ]),
            }),
        ]));
    } finally {
        await app.stop();
    }
});

it('returns exit code 1 for a failed model run', async () => {
    const app = createApp({ agents: [example], models: fakeModels(fakeModel([])) });
    try {
        expect(await app.runJob({ agent: 'example', env: {} }))
            .toMatchObject({ status: 'failed', exitCode: 1 });
    } finally {
        await app.stop();
    }
});
