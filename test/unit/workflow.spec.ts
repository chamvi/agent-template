import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { parse } from 'yaml';

type Step = { uses?: string; with?: Record<string, unknown> };

it('checks out without persisting the token, since npm ci runs dependency scripts', () => {
    const workflow = parse(readFileSync('.github/workflows/ci.yml', 'utf8')) as { jobs: Record<string, { steps: Step[] }> };
    const checkouts = Object.values(workflow.jobs)
        .flatMap((job) => job.steps)
        .filter((step) => step.uses?.startsWith('actions/checkout@'));
    expect(checkouts.length).toBeGreaterThan(0);
    for (const step of checkouts) {
        expect(step.with?.['persist-credentials']).toBe(false);
    }
});
