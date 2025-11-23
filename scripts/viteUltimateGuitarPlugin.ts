import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { fetchUltimateGuitarSong, searchUltimateGuitar } from './ultimateGuitar';

const parseBody = (req: IncomingMessage): Promise<Record<string, unknown>> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => {
      if (!chunks.length) {
        resolve({});
        return;
      }
      try {
        const payload = Buffer.concat(chunks).toString('utf8');
        resolve(JSON.parse(payload) as Record<string, unknown>);
      } catch (error) {
        reject(new Error(`Invalid JSON body: ${(error as Error).message}`));
      }
    });
    req.on('error', reject);
  });

const handleImportRequest = async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const body = await parseBody(req);
    const source = typeof body.source === 'string' ? body.source : '';
    const result = await fetchUltimateGuitarSong(source);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ result }));
  } catch (error) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: (error as Error).message || 'Unable to import from Ultimate Guitar',
      }),
    );
  }
};

const handleSearchRequest = async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const body = await parseBody(req);
    const query = typeof body.query === 'string' ? body.query : '';
    const page = typeof body.page === 'number' && body.page > 0 ? body.page : 1;
    const limit = typeof body.limit === 'number' && body.limit > 0 && body.limit <= 25 ? body.limit : 12;
    const results = await searchUltimateGuitar(query, page, limit);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ results }));
  } catch (error) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: (error as Error).message || 'Unable to search Ultimate Guitar',
      }),
    );
  }
};

const registerMiddleware = (server: {
  middlewares: {
    use: (
      handler: (req: IncomingMessage, res: ServerResponse, next: () => void) => void,
    ) => void;
  };
}) => {
  server.middlewares.use((req, res, next) => {
    if (req.url?.startsWith('/api/ultimate-guitar/import')) {
      handleImportRequest(req, res);
      return;
    }
    if (req.url?.startsWith('/api/ultimate-guitar/search')) {
      handleSearchRequest(req, res);
      return;
    }
    next();
  });
};

export const ultimateGuitarPlugin = (): Plugin => ({
  name: 'ultimate-guitar-proxy',
  configureServer(server) {
    registerMiddleware(server);
  },
  configurePreviewServer(server) {
    registerMiddleware(server);
  },
});
