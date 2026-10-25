import { expect, it } from 'vitest';
import { EXAMPLE_MODEL } from '../../src/agents/example.ts';
import { fakeModel, fakeModels } from '../utils/model.ts';

it('serves the fake model under the provider and id of a model string', () => {
    const model = fakeModel([]);
    const models = fakeModels(model, 'anthropic/claude-opus-5-5');
    expect(models.anthropic!.languageModel('claude-opus-5-5')).toBe(model);
});

it('serves the fake model under EXAMPLE_MODEL by default', () => {
    const model = fakeModel([]);
    const [provider, id] = EXAMPLE_MODEL.split('/') as [string, string];
    expect(fakeModels(model)[provider]!.languageModel(id)).toBe(model);
});
