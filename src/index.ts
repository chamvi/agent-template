import { createApp } from '@chamvi/app';
import { example } from './agents/example.ts';
import { modules } from './modules.ts';

export default createApp({
    model: 'anthropic/claude-sonnet-5-5',
    agents: [example],
    modules,
});
