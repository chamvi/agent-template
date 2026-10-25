import {
    cron,
    defineAgent,
    defineTool,
    http,
} from '@chamvi/app';
import { z } from 'zod';

export const EXAMPLE_MODEL = 'anthropic/claude-sonnet-5-5';

export const countWords = defineTool({
    description: 'Count the whitespace-separated words in a text.',
    inputSchema: z.object({ text: z.string() }),
    execute: async ({ text }) => ({ words: text.match(/\S+/gu)?.length ?? 0 }),
});

export const example = defineAgent({
    name: 'example',
    model: EXAMPLE_MODEL,
    instructions: 'Summarize the supplied text in one sentence. Call count_words on the text first and state the word count in your answer.',
    channels: [
        http.on({ schema: z.object({ text: z.string().min(1).max(10_000) }) }),
        cron.on('0 8 * * 1', {
            timezone: 'Europe/Berlin',
            payload: { text: 'Weekly check-in: say hello and report the word count of this sentence.' },
        }),
    ],
    tools: { count_words: countWords },
    budget: { maxSteps: 5 },
});
