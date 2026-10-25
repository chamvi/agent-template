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

const section = (readme: string, heading: string) => readme.split(`\n## ${heading}\n`)[1]!.split('\n## ')[0]!;

it('the rename checklist names every file and spec that pins the names', () => {
    const checklist = section(readFileSync('README.md', 'utf8'), 'Use this template');
    expect(checklist).toContain('README.md');
    expect(checklist).toContain('test/unit/deploy.spec.ts');
    expect(checklist).toContain('test/unit/readme.spec.ts');
    expect(checklist).toContain('npm install --package-lock-only');
});

it('the Flux section says to replace the placeholders before the first apply', () => {
    const flux = section(readFileSync('README.md', 'utf8'), 'Deploy with Flux');
    const release = parseDocument(readFileSync('deploy/flux/release.yaml', 'utf8')).toJSON() as {
        spec: { values: { image: { tag: string } } };
    };
    expect(flux).toContain(`\`${release.spec.values.image.tag}\``);
    expect(readFileSync('deploy/flux/image-automation.yaml', 'utf8')).toContain('path: ./clusters/<cluster>');
    expect(flux).toContain('`spec.update.path`');
    expect(flux).toContain('`./clusters/<cluster>`');
});

it('the kind section names the Service the way the chart does', () => {
    // agent-app's fullname is the release name alone when it already contains "agent-app".
    const kind = section(readFileSync('README.md', 'utf8'), 'Try it on kind');
    const release = /helm install (\S+) oci:/u.exec(kind)![1]!;
    const service = release.includes('agent-app') ? release : `${release}-agent-app`;
    expect(kind).toContain(`port-forward svc/${service} `);
    expect(kind).toContain('unless the release name already contains `agent-app`');
});

it('the Flux section says where a failed run-job leaves its error', () => {
    const flux = section(readFileSync('README.md', 'utf8'), 'Deploy with Flux');
    expect(flux).toMatch(/run-job[^\n]*prints only[^\n]*DATABASE_URL/u);
});

it('the kind commands run as printed in a shell', () => {
    const kind = section(readFileSync('README.md', 'utf8'), 'Try it on kind');
    const commands = /```bash\n([\s\S]*?)```/u.exec(kind)![1]!;
    // An unquoted <placeholder> is shell redirection, so the command would fail.
    expect(commands).not.toMatch(/(?<!['"])<[a-z][^>]*>/u);
    expect(commands).toContain('--from-literal=ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"');
});
