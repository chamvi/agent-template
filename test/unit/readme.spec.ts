import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { parseDocument } from 'yaml';

it('README embeds src/agents/example.ts verbatim', () => {
    expect(readFileSync('README.md', 'utf8'))
        .toContain(readFileSync('src/agents/example.ts', 'utf8').trimEnd());
});

it('every npm run command the README shows is a package.json script', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
    const shown = readFileSync('README.md', 'utf8').matchAll(/npm run ([\w:-]+)/g)
        .map((match) => match[1]!).toArray();
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.filter((script) => !(script in pkg.scripts))).toEqual([]);
});

it('README shows how to install deploy/kind/values.yaml on a kind cluster', () => {
    const readme = readFileSync('README.md', 'utf8');
    const values = parseDocument(readFileSync('deploy/kind/values.yaml', 'utf8')).toJSON() as {
        image: { repository: string; tag: string };
        secrets: string[];
    };
    const image = `${values.image.repository}:${values.image.tag}`;
    expect(readme).toContain(`docker build -t ${image} .`);
    expect(readme).toContain(`kind load docker-image ${image}`);
    for (const secret of values.secrets) {
        expect(readme).toContain(`create secret generic ${secret}`);
    }
    expect(readme).toMatch(/helm install \S+ oci:\/\/ghcr\.io\/chamvi\/helm\/agent-app [^\n]*\\\n[^\n]*-f deploy\/kind\/values\.yaml/);
});
