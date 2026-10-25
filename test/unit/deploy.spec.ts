import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { parseAllDocuments } from 'yaml';

const read = (name: string) => readFileSync(`deploy/flux/${name}.yaml`, 'utf8');
const parse = (text: string) => parseAllDocuments(text).map((doc) => {
    expect(doc.errors).toEqual([]);
    return doc.toJSON();
});
const docs = (name: string) => parse(read(name));

// The ghcr.io/chamvi/* images need no pull secret; a private application image uses the
// commented imagePullSecrets and secretRef options, which must then name a Secret.
function checkPullSecrets(release: any, automation: any[]) {
    const pullSecrets = release.spec.values.imagePullSecrets;
    if (pullSecrets !== undefined) {
        expect(pullSecrets).toEqual(expect.arrayContaining([expect.objectContaining({ name: expect.any(String) })]));
        expect(pullSecrets.every((entry: { name?: unknown }) => typeof entry.name === 'string' && entry.name !== '')).toBe(true);
    }
    const { secretRef } = automation[0].spec;
    if (secretRef !== undefined) {
        expect(secretRef).toEqual({ name: expect.stringMatching(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/) });
    }
}

it('uses current Flux APIs and consistent image policy names', () => {
    const release = docs('release')[0];
    const chart = docs('chart')[0];
    const automation = docs('image-automation');
    expect(release.apiVersion).toBe('helm.toolkit.fluxcd.io/v2');
    expect(chart.apiVersion).toBe('source.toolkit.fluxcd.io/v1');
    expect(chart.spec.url).toBe('oci://ghcr.io/chamvi/helm/agent-app');
    expect(chart.spec.layerSelector.operation).toBe('copy');
    expect(release.spec.chartRef.name).toBe(chart.metadata.name);
    expect(release.spec.chartRef.namespace).toBe(chart.metadata.namespace);
    expect(docs('namespace')[0].metadata.name).toBe(release.metadata.namespace);
    expect(docs('secret.example')[0].metadata.name).toBe(`${release.metadata.name}-env`);
    expect(automation.map((doc) => doc.apiVersion)).toEqual(Array(3).fill('image.toolkit.fluxcd.io/v1'));
    expect(automation[0].spec.image).toBe(release.spec.values.image.repository);
    expect(automation[0].metadata.name).toBe(release.metadata.name);
    expect(automation[1].metadata.name).toBe(release.metadata.name);
    const policy = automation[1].metadata;
    const marker = (field: string) => `# {"$imagepolicy": "${policy.namespace}:${policy.name}:${field}"}`;
    expect(read('release')).toContain(marker('tag'));
    expect(read('release')).toContain(marker('name'));
    expect(parseAllDocuments(readFileSync('deploy/kind/values.yaml', 'utf8'))[0]!.toJSON().secrets)
        .toEqual(release.spec.values.secrets);
    expect(Object.keys(release.spec.values).filter((key) => ![
        'image',
        'imagePullSecrets',
        'replicas',
        'command',
        'basePath',
        'env',
        'secrets',
        'ingress',
        'sandbox',
        'cronJobs',
        'serviceMonitor',
        'resources',
    ].includes(key))).toEqual([]);
    expect(release.spec.values.env.CHAMVI_PUBLIC_URL).toBe(new URL(release.spec.values.env.CHAMVI_PUBLIC_URL).origin);
    checkPullSecrets(release, automation);
    expect(docs('kustomization')[0].resources).toEqual(['namespace.yaml', 'chart.yaml', 'release.yaml']);
    expect(docs('secret.example')[0].stringData).not.toHaveProperty('RESUME_SECRET');
});

it('accepts the commented private-image options once enabled', () => {
    const uncomment = (text: string, key: string) => text.replace(new RegExp(`# (${key}:.*)\\n(\\s*)#( +name: .*)`), '$1\n$2$3')
        .replace(new RegExp(`# (${key}: \\[.*)`), '$1');
    const release = parse(uncomment(read('release'), 'imagePullSecrets'))[0];
    const automation = parse(uncomment(read('image-automation'), 'secretRef'));
    expect(release.spec.values.imagePullSecrets).toEqual([{ name: 'registry' }]);
    expect(automation[0].spec.secretRef).toEqual({ name: 'registry' });
    checkPullSecrets(release, automation);
});

// Leaf paths of the agent-app 0.1.x values.yaml these examples may set (the chart
// refuses unknown keys through its schema; a typo would otherwise be ignored).
const CHART_VALUE_PATHS = [
    'image.repository',
    'image.tag',
    'image.digest',
    'image.pullPolicy',
    'imagePullSecrets',
    'replicas',
    'command',
    'basePath',
    'env.*',
    'secrets',
    'resources',
    'ingress.enabled',
    'ingress.className',
    'ingress.host',
    'ingress.annotations',
    'ingress.tls.secretName',
    'cronJobs',
    'sandbox.enabled',
    'sandbox.namespace',
    'serviceMonitor.enabled',
];

function leafPaths(value: unknown, prefix = ''): string[] {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return [prefix];
    if (prefix === 'env') return [`${prefix}.*`];
    return Object.entries(value).flatMap(([key, child]) => leafPaths(child, prefix ? `${prefix}.${key}` : key));
}

it.each([
    ['deploy/flux/release.yaml', () => docs('release')[0].spec.values],
    ['deploy/kind/values.yaml', () => parseAllDocuments(readFileSync('deploy/kind/values.yaml', 'utf8'))[0]!.toJSON()],
])('sets only agent-app chart values in %s', (_file, values) => {
    expect(leafPaths(values()).filter((path) => !CHART_VALUE_PATHS.includes(path))).toEqual([]);
});
