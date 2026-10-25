import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { parseDocument } from 'yaml';

type Step = {
    uses?: string;
    run?: string;
    with?: Record<string, string>
};
type Job = { permissions?: Record<string, string>; steps: Step[] };

it('logs in to ghcr.io before the docker job builds on ghcr.io/chamvi/node', () => {
    // The base image may be private; a read-only login with the workflow token pulls it either way.
    const workflow = parseDocument(readFileSync('.github/workflows/ci.yml', 'utf8')).toJSON() as { jobs: Record<string, Job> };
    const job = workflow.jobs.docker!;
    const build = job.steps.findIndex((step) => step.run?.startsWith('docker build'));
    expect(build).toBeGreaterThan(0);
    expect(job.permissions).toEqual({ contents: 'read', packages: 'read' });
    const login = job.steps.slice(0, build).filter((step) => step.uses?.startsWith('docker/login-action@'));
    expect(login.map((step) => step.with)).toEqual([{
        registry: 'ghcr.io',
        username: '${{ github.actor }}',
        password: '${{ secrets.GITHUB_TOKEN }}',
    }]);
});
