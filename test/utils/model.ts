import type { AppOptions } from '@chamvi/app';
import { customProvider, simulateReadableStream } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';

export type FakeTurn = {
    text?: string;
    toolCalls?: Array<{ toolName: string; input: unknown }>;
};

type StreamResult = Awaited<ReturnType<MockLanguageModelV4['doStream']>>;
type StreamPart = StreamResult['stream'] extends ReadableStream<infer Part> ? Part : never;

/** Script only the model boundary; the app, tools, store and HTTP stay real. */
export function fakeModel(turns: FakeTurn[]): MockLanguageModelV4 {
    let turn = 0;
    return new MockLanguageModelV4({
        doStream: async () => {
            const index = turn++;
            const response = turns[index];
            if (!response) throw new Error('fake model script exhausted');
            const chunks: StreamPart[] = [{ type: 'stream-start', warnings: [] }];
            if (response.text !== undefined) {
                chunks.push(
                    { type: 'text-start', id: 'text' },
                    {
                        type: 'text-delta',
                        id: 'text',
                        delta: response.text,
                    },
                    { type: 'text-end', id: 'text' },
                );
            }
            for (const [i, call] of (response.toolCalls ?? []).entries()) {
                chunks.push({
                    type: 'tool-call',
                    toolCallId: `call-${index}-${i}`,
                    toolName: call.toolName,
                    input: JSON.stringify(call.input),
                });
            }
            chunks.push({
                type: 'finish',
                finishReason: { unified: response.toolCalls?.length ? 'tool-calls' : 'stop', raw: undefined },
                usage: {
                    inputTokens: {
                        total: 1,
                        noCache: 1,
                        cacheRead: undefined,
                        cacheWrite: undefined,
                    },
                    outputTokens: {
                        total: 1,
                        text: 1,
                        reasoning: undefined,
                    },
                },
            });
            return {
                stream: simulateReadableStream({
                    chunks,
                    initialDelayInMs: null,
                    chunkDelayInMs: null,
                }),
            };
        },
    });
}

export function fakeModels(model: MockLanguageModelV4): NonNullable<AppOptions['models']> {
    return { anthropic: customProvider({ languageModels: { 'claude-sonnet-5-5': model } }) };
}
