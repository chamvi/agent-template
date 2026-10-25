import config from '@tada5hi/eslint-config';

export default [
    ...await config(),
    // .editorconfig trims trailing whitespace; keep lint:fix in step with it.
    { rules: { '@stylistic/no-trailing-spaces': 'error' } },
    { ignores: ['**/dist/**', '**/coverage/**', '**/.tmp/**'] },
];
