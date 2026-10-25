import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

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
