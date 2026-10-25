import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const CLI = fileURLToPath(new URL('../../node_modules/@chamvi/cli/dist/cli.mjs', import.meta.url));

export type ProcessResult = {
    code: number | null; 
    signal: NodeJS.Signals | null; 
    stdout: string; 
    stderr: string 
};

export function startNode(args: string[], env: NodeJS.ProcessEnv = {}): {
    child: ChildProcess;
    result: Promise<ProcessResult>;
} {
    const child = spawn(process.execPath, args, {
        cwd: ROOT,
        env: { PATH: process.env.PATH, ...env },
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    const result = new Promise<ProcessResult>((resolve, reject) => {
        let stdout = '';
        let stderr = '';
        const timeout = setTimeout(() => child.kill('SIGKILL'), 20_000);
        child.stdout!.setEncoding('utf8').on('data', (chunk: string) => { stdout += chunk; });
        child.stderr!.setEncoding('utf8').on('data', (chunk: string) => { stderr += chunk; });
        child.once('error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });
        child.once('close', (code, signal) => {
            clearTimeout(timeout);
            resolve({
                code, 
                signal, 
                stdout, 
                stderr, 
            });
        });
    });
    return { child, result };
}

export async function temporaryDirectory(prefix: string): Promise<string> {
    const root = fileURLToPath(new URL('../../.tmp/', import.meta.url));
    await mkdir(root, { recursive: true });
    return mkdtemp(`${root}${prefix}`);
}
