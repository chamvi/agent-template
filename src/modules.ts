import type { AppOptions } from '@chamvi/app';
import { uiModule } from '@chamvi/ui/module';

// Install each feature package before enabling its import and module below.
// import { githubModule } from '@chamvi/github/module';
// import { sandboxModule } from '@chamvi/sandbox/module';
// import { openclawModule } from '@chamvi/channel-openclaw/module';
// import { consoleChannelModule } from '@chamvi/app';

// githubModule() reads GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY and GITHUB_WEBHOOK_SECRET (see .env.example) when
// called; use injectGithubContext(ctx).readTools() in an agent's tools factory.
// const github = githubModule();

export const modules: NonNullable<AppOptions['modules']> = [
    uiModule(),
    // Signed deliveries at /channels/github and outbound comments/approval links.
    // github,
    // Also install @chamvi/sandbox-k8s and set CHAMVI_SANDBOX_NAMESPACE.
    // sandboxModule({ provider: 'kubernetes' }),
    // Outbound OpenClaw messages; set OPENCLAW_* and CHAMVI_PUBLIC_URL.
    // openclawModule(),
    // Outbound console messages for tools using ctx.channels.findOneOrFail('console').
    // consoleChannelModule(),
];
