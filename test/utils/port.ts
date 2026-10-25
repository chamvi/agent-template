import { createServer } from 'node:net';

export async function freePort(): Promise<number> {
    const server = createServer();
    return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            server.close((error) => {
                if (error) reject(error);
                else if (!address || typeof address === 'string') reject(new Error('No TCP port assigned'));
                else resolve(address.port);
            });
        });
    });
}
