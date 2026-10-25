import { createApp } from '@chamvi/app';
import { example } from './agents/example.ts';
import { modules } from './modules.ts';

export default createApp({ agents: [example], modules });
