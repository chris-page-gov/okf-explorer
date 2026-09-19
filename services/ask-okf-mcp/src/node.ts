import { createServer } from 'node:http';
import { toNodeHandler } from '@modelcontextprotocol/node';
import indexText from '../vendor/okf-dwp-assembly-index.json?raw';
import descriptorText from '../vendor/okf-dwp-descriptor.json?raw';
import { createAskService, DEFAULT_ORIGINS } from './service.ts';
import { verifyBundledContext } from './registry.ts';
const port = Number(process.env.ASK_OKF_PORT ?? 8787);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('ASK_OKF_PORT must be a port from 1024 to 65535.');
const localOrigin = `http://127.0.0.1:${port}`;
const approved = verifyBundledContext(indexText, descriptorText);
await approved;
const service = createAskService({
  loadContext: () => approved,
  allowedHosts: [`127.0.0.1:${port}`, `localhost:${port}`],
  allowedOrigins: [...DEFAULT_ORIGINS, localOrigin, `http://localhost:${port}`],
  diagnostics: (entry) => console.log(JSON.stringify(entry))
});
const handle = toNodeHandler(service, { onerror: () => console.error('{"event":"node_adapter_error"}') });
const server = createServer({ maxHeaderSize: 16384, requestTimeout: 15000, headersTimeout: 10000 }, (req, res) => {
  void handle(req, res);
});
server.listen(port, '127.0.0.1', () => console.log(JSON.stringify({ event: 'listening', endpoint: `${localOrigin}/mcp` })));
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => { server.close(); void service.close(); });
